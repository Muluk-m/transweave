# Phase 7: AI Translation - Research

**Researched:** 2026-03-01
**Domain:** Multi-provider AI translation with user-supplied API keys
**Confidence:** HIGH

## Summary

This phase transforms the existing hardcoded Dify AI integration into a multi-provider, user-configured, fully optional AI translation system. The current `AiService` is tightly coupled to a single Dify endpoint with a hardcoded API key. The target architecture uses a provider adapter pattern where each AI/translation provider (OpenAI, Claude, DeepL, Google Translate) implements a common interface, and users supply their own API keys at the team or project level.

The key architectural insight is that this is fundamentally a strategy pattern problem. The existing `callDify()` method becomes one of several provider adapters behind a `TranslationProvider` interface. The service selects the appropriate adapter at runtime based on the user's configured provider. API keys are stored encrypted in a JSONB column on the team or project table, and the entire AI subsystem is a no-op when no provider is configured.

**Primary recommendation:** Implement a `TranslationProvider` interface with adapters for OpenAI, Claude, DeepL, and Google Translate. Store provider configuration as encrypted JSONB on team/project. Make the AI module completely lazy -- no provider SDKs loaded until a user actually configures one.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AI-01 | User can configure AI translation provider (OpenAI, Claude, DeepL, Google Translate, etc.) | Provider adapter pattern with runtime selection; UI settings page for provider + API key entry; JSONB config stored on team/project |
| AI-02 | User provides their own API key for the selected AI provider | API keys stored encrypted in database; keys never logged or exposed in API responses; decrypted only at call time |
| AI-03 | User can trigger AI translation for individual tokens or batch of tokens | Reuse existing single-token and batch-translate UI flows; swap `translateWithAi` backend to route through configured provider |
| AI-04 | AI translation is optional -- platform runs fully without any AI provider configured | AI module checks for configuration before enabling endpoints; UI hides translate buttons when no provider configured; no provider SDKs imported at startup |
| AI-05 | AI provider configuration stored per team or per project | JSONB column on both team and project tables; project-level config overrides team-level; fallback chain: project -> team -> disabled |
</phase_requirements>

## Standard Stack

### Core

| Library | Purpose | Why Standard |
|---------|---------|--------------|
| `openai` (npm) | OpenAI and Claude API client | Official OpenAI SDK; Claude's API is OpenAI-compatible so one client covers both providers |
| `node:crypto` | API key encryption at rest | Built-in Node.js module; AES-256-GCM for encrypting stored API keys; no external dependency |
| `@nestjs/axios` / `axios` | HTTP client for DeepL and Google Translate APIs | Already in the project; DeepL and Google Translate use simple REST endpoints, no SDK needed |

### Supporting

| Library | Purpose | When to Use |
|---------|---------|-------------|
| `p-queue` | Rate limiting and concurrency control for batch translations | When batch-translating many tokens to avoid hitting provider rate limits |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `openai` npm package | Direct HTTP calls via axios | OpenAI SDK handles streaming, retries, and type safety out of the box; axios would require reimplementing these |
| Separate `@anthropic-ai/sdk` for Claude | Use `openai` SDK with Claude's OpenAI-compatible endpoint | One fewer dependency; Claude's messages API is OpenAI-compatible at `https://api.anthropic.com/v1/` |
| DeepL official SDK (`deepl-node`) | Direct HTTP via axios | DeepL's REST API is simple enough (single POST endpoint) that axios is sufficient; avoids another dependency |
| Google Cloud Translation SDK | Direct HTTP via axios | Google Translate v2 API is a single endpoint with API key auth; full SDK is overkill |

**Installation:**
```bash
pnpm --filter server add openai p-queue
```

## Architecture Patterns

### Recommended Project Structure
```
packages/server/src/
  ai/                             # AI module (new, replaces current ai.service.ts)
    providers/
      translation-provider.interface.ts  # Common interface
      openai.provider.ts                 # OpenAI adapter
      claude.provider.ts                 # Claude adapter (via OpenAI SDK)
      deepl.provider.ts                  # DeepL adapter
      google-translate.provider.ts       # Google Translate adapter
      provider-factory.ts               # Factory that creates provider from config
    ai.module.ts                  # NestJS module (lazy-loaded)
    ai.service.ts                 # Orchestrator: loads config, selects provider, calls translate
    ai.controller.ts              # HTTP endpoints (unchanged API contract)
    ai-config.service.ts          # CRUD for provider configuration
    ai-config.controller.ts       # Settings endpoints for provider config
    encryption.util.ts            # AES-256-GCM encrypt/decrypt for API keys
```

### Pattern 1: Translation Provider Interface

**What:** A common interface that all AI/translation providers implement.
**When to use:** Every provider adapter must implement this interface.

```typescript
// ai/providers/translation-provider.interface.ts
export interface TranslationProvider {
  readonly name: string;

  translate(params: {
    text: string;
    from: string;
    to: string[];
  }): Promise<Record<string, string>>;

  validateApiKey(): Promise<boolean>;
}

export interface ProviderConfig {
  provider: 'openai' | 'claude' | 'deepl' | 'google-translate';
  apiKey: string;           // encrypted at rest, decrypted before passing to adapter
  model?: string;           // e.g., 'gpt-4o-mini' for OpenAI, 'claude-sonnet-4-20250514' for Claude
  baseUrl?: string;         // optional custom endpoint (for proxies, Azure OpenAI, etc.)
}
```

### Pattern 2: Provider Factory

**What:** Creates the appropriate provider adapter from a `ProviderConfig`.
**When to use:** When the AI service needs to translate and must instantiate the correct provider.

```typescript
// ai/providers/provider-factory.ts
export function createTranslationProvider(config: ProviderConfig): TranslationProvider {
  switch (config.provider) {
    case 'openai':
      return new OpenAIProvider(config.apiKey, config.model, config.baseUrl);
    case 'claude':
      return new ClaudeProvider(config.apiKey, config.model);
    case 'deepl':
      return new DeepLProvider(config.apiKey);
    case 'google-translate':
      return new GoogleTranslateProvider(config.apiKey);
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}
```

### Pattern 3: Configuration Fallback Chain

**What:** AI provider config is resolved with project-level overriding team-level.
**When to use:** Every AI translation request.

```typescript
// ai/ai.service.ts (simplified)
async getProviderConfig(projectId: string): Promise<ProviderConfig | null> {
  // 1. Check project-level config
  const project = await this.projectRepo.findById(projectId);
  if (project?.aiConfig?.provider && project?.aiConfig?.apiKey) {
    return this.decryptConfig(project.aiConfig);
  }

  // 2. Fall back to team-level config
  const team = await this.teamRepo.findById(project.teamId);
  if (team?.aiConfig?.provider && team?.aiConfig?.apiKey) {
    return this.decryptConfig(team.aiConfig);
  }

  // 3. No config found -- AI is disabled
  return null;
}
```

### Pattern 4: Graceful Degradation (AI-04)

**What:** The entire AI subsystem is a no-op when unconfigured.
**When to use:** Always -- this is required by AI-04.

```typescript
// ai/ai.controller.ts
@Post('translate')
async translate(@Body() data: TranslateDto, @CurrentUser() user: User) {
  const config = await this.aiService.getProviderConfig(data.projectId);
  if (!config) {
    throw new HttpException(
      'No AI provider configured. Configure one in team or project settings.',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
  return this.aiService.translate(data, config);
}

// Frontend: hide translate buttons when no provider configured
// GET /api/ai/status?projectId=xxx returns { configured: boolean, provider?: string }
```

### Anti-Patterns to Avoid

- **Hardcoded API keys:** The current code has `const DIFY_API_KEY = process.env.DIFY_API_KEY || 'app-QFt9YXsFIT9YMeVcvn9muuaR'` -- a hardcoded fallback API key. The new system must never have hardcoded keys; keys come exclusively from user configuration in the database.
- **Global singleton provider:** Do not create a single provider instance at startup. Different projects may use different providers. Create providers per-request from the resolved config.
- **Storing API keys in plaintext:** API keys must be encrypted at rest using AES-256-GCM. The encryption key comes from an environment variable (`AI_ENCRYPTION_KEY`). If the env var is missing, the system refuses to store API keys rather than storing them in plaintext.
- **Importing all provider SDKs eagerly:** Do not `import OpenAI from 'openai'` at module initialization. Use dynamic imports so that provider SDKs are only loaded when actually needed.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OpenAI/Claude API client | Custom HTTP wrapper for chat completions | `openai` npm package | Handles retries, streaming, rate limits, type safety; OpenAI-compatible for Claude too |
| Batch concurrency control | Custom promise queue or sequential loop | `p-queue` | Battle-tested concurrency limiter with configurable parallelism and rate limiting |
| API key encryption | Custom XOR or Base64 "encryption" | `node:crypto` AES-256-GCM | Proper authenticated encryption; anything less is security theater |
| Translation prompt engineering | Unique prompt per provider | Shared prompt template across providers | LLM providers (OpenAI, Claude) all understand the same JSON-output translation prompt; reuse the existing proven prompt |

**Key insight:** The translation prompt already works well (proven in current Dify integration). The challenge is not prompt engineering -- it is plumbing: routing requests to the right provider with the right credentials.

## Common Pitfalls

### Pitfall 1: API Key Leakage in Logs and API Responses

**What goes wrong:** API keys end up in error messages, server logs, or API response bodies.
**Why it happens:** Error handlers stringify the entire request config (including Authorization headers). Logging interceptors capture request/response bodies that contain API keys.
**How to avoid:** Never include API keys in error messages. Mask keys in logs (show only last 4 characters). Ensure AI config API responses never include the full key -- return `{ provider: 'openai', keyHint: '...abc1', configured: true }` instead.
**Warning signs:** Grep for `apiKey` in log output; check error serialization.

### Pitfall 2: Provider Rate Limits During Batch Translation

**What goes wrong:** Batch-translating 50+ tokens fires 50+ API calls in parallel, hitting provider rate limits (429 errors). DeepL free tier allows 5 req/s; OpenAI varies by model.
**Why it happens:** The current `handleBatchTranslateSelected` fires sequential requests per token, but each translation is a separate API call. At scale, even sequential calls can hit rate limits.
**How to avoid:** Use `p-queue` with provider-specific concurrency limits. OpenAI: 5 concurrent. DeepL: 3 concurrent. Google: 10 concurrent. Add exponential backoff on 429 responses.
**Warning signs:** Batch translations fail partway through; intermittent 429 errors.

### Pitfall 3: Encryption Key Management

**What goes wrong:** Users lose access to all stored API keys when `AI_ENCRYPTION_KEY` environment variable changes (container restart, new deployment without the env var).
**Why it happens:** AES-256-GCM decryption fails if the key changes.
**How to avoid:** Document `AI_ENCRYPTION_KEY` prominently in `.env.example`. Make it a required env var when AI features are used (not at startup). Provide a clear error message when decryption fails: "AI provider configuration is corrupted. Please re-enter your API key."
**Warning signs:** AI translations suddenly stop working after deployment changes.

### Pitfall 4: Inconsistent JSON Output from LLMs

**What goes wrong:** LLMs sometimes return JSON wrapped in markdown code blocks, or add explanatory text before/after the JSON.
**Why it happens:** LLMs are unpredictable. Despite the prompt saying "only return valid JSON," models sometimes add ` ```json ` wrappers or preambles.
**How to avoid:** The existing `safeParseJson` handles simple cases. Add a JSON extraction step that strips markdown code blocks before parsing. For OpenAI, use `response_format: { type: "json_object" }` to enforce structured output. For Claude, use the same prompt but add JSON extraction as fallback.
**Warning signs:** Translation results returning null; `safeParseJson` failing silently.

### Pitfall 5: DeepL and Google Translate Have Different API Contracts

**What goes wrong:** Treating DeepL/Google like LLMs -- sending them the same chat-completion-style prompt.
**Why it happens:** LLMs take free-form prompts and return translations as JSON. DeepL/Google have structured APIs: you send `{text, source_lang, target_lang}` and get back `{translations: [{text}]}`. They translate one language pair at a time, not multi-target in one call.
**How to avoid:** The provider interface abstracts this. LLM providers (OpenAI, Claude) translate to all target languages in one call. Translation API providers (DeepL, Google) make one call per target language. The adapter handles the difference -- the service sees the same `Record<string, string>` output.
**Warning signs:** DeepL/Google adapter code trying to send prompts; getting unexpected responses.

## Code Examples

### OpenAI Provider Adapter

```typescript
// ai/providers/openai.provider.ts
import type { TranslationProvider, ProviderConfig } from './translation-provider.interface';

export class OpenAIProvider implements TranslationProvider {
  readonly name = 'openai';
  private client: any; // lazily initialized

  constructor(
    private apiKey: string,
    private model: string = 'gpt-4o-mini',
    private baseUrl?: string,
  ) {}

  private async getClient() {
    if (!this.client) {
      const { default: OpenAI } = await import('openai');
      this.client = new OpenAI({
        apiKey: this.apiKey,
        ...(this.baseUrl && { baseURL: this.baseUrl }),
      });
    }
    return this.client;
  }

  async translate(params: { text: string; from: string; to: string[] }): Promise<Record<string, string>> {
    const client = await this.getClient();
    const prompt = buildTranslationPrompt(params.text, params.from, params.to);

    const response = await client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response from OpenAI');

    return JSON.parse(content);
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const client = await this.getClient();
      await client.models.list();
      return true;
    } catch {
      return false;
    }
  }
}
```

### DeepL Provider Adapter

```typescript
// ai/providers/deepl.provider.ts
import type { TranslationProvider } from './translation-provider.interface';

export class DeepLProvider implements TranslationProvider {
  readonly name = 'deepl';
  private baseUrl: string;

  constructor(private apiKey: string) {
    // DeepL free keys end with ':fx', use free API endpoint
    this.baseUrl = apiKey.endsWith(':fx')
      ? 'https://api-free.deepl.com/v2'
      : 'https://api.deepl.com/v2';
  }

  async translate(params: { text: string; from: string; to: string[] }): Promise<Record<string, string>> {
    const results: Record<string, string> = {};

    // DeepL translates one target language at a time
    for (const targetLang of params.to) {
      const response = await fetch(`${this.baseUrl}/translate`, {
        method: 'POST',
        headers: {
          'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: [params.text],
          source_lang: params.from.toUpperCase(),
          target_lang: this.mapLanguageCode(targetLang),
        }),
      });

      if (!response.ok) throw new Error(`DeepL error: ${response.status}`);
      const data = await response.json();
      results[targetLang] = data.translations[0].text;
    }

    return results;
  }

  private mapLanguageCode(code: string): string {
    // DeepL uses specific codes: 'en' -> 'EN', 'pt-BR' -> 'PT-BR', 'zh' -> 'ZH'
    const mapping: Record<string, string> = {
      'en': 'EN',
      'zh': 'ZH',
      'zh-CN': 'ZH-HANS',
      'zh-TW': 'ZH-HANT',
      'pt': 'PT-PT',
      'pt-BR': 'PT-BR',
    };
    return mapping[code] || code.toUpperCase();
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/usage`, {
        headers: { 'Authorization': `DeepL-Auth-Key ${this.apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
```

### API Key Encryption

```typescript
// ai/encryption.util.ts
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const secret = process.env.AI_ENCRYPTION_KEY;
  if (!secret) throw new Error('AI_ENCRYPTION_KEY environment variable is required for storing API keys');
  return scryptSync(secret, 'qlj-i18n-ai-salt', 32);
}

export function encryptApiKey(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: iv:tag:encrypted (all base64)
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptApiKey(ciphertext: string): string {
  const key = getEncryptionKey();
  const [ivB64, tagB64, encB64] = ciphertext.split(':');
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const encrypted = Buffer.from(encB64, 'base64');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final('utf8');
}
```

### Shared Translation Prompt

```typescript
// ai/providers/prompt.ts
export function buildTranslationPrompt(text: string, from: string, to: string[]): string {
  return `
You are a professional translation engine. Translate the following text from the source language to each of the target languages. Maintain the meaning, tone, and formatting as accurately as possible.

Input:
- Text: "${text}"
- Source Language (ISO 639-1): ${from}
- Target Languages (ISO 639-1): [${to.join(', ')}]

Output Requirements:
- Only return a valid JSON object as plain text.
- Do not include any comments, explanations, or Markdown code blocks.
- The result must be strictly parsable with JSON.parse() in JavaScript.
- Ensure all characters are properly escaped to conform to JSON syntax.

Output the result in JSON format as:
{
  ${to.map(lang => `"${lang}": "translated text in ${lang}"`).join(',\n  ')}
}
`.trim();
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single AI provider (Dify) with server-managed API key | Multi-provider with user-supplied API keys | This phase | Users control costs and provider choice |
| Hardcoded API key in source code | Encrypted API keys in database | This phase | Security and portability |
| AI always available (Dify always configured) | AI fully optional, graceful degradation | This phase | Platform works standalone |
| OpenAI text-only responses | OpenAI `response_format: { type: "json_object" }` | 2024 | More reliable JSON output from LLMs |
| DeepL v1 API | DeepL v2 API | 2023 | Better language support, formality parameter |

**Deprecated/outdated:**
- Dify integration: Will be removed. Dify is a proprietary SaaS workflow platform -- contradicts self-hosted independence.
- Hardcoded `DIFY_API_KEY` fallback: Security issue. Must be removed.

## Open Questions

1. **Should the `generateTokenKey` feature (AI key generation) also be multi-provider?**
   - What we know: Currently uses Dify. The prompt works well and is provider-agnostic (it is pure text generation).
   - What's unclear: Whether this feature should use the same provider config as translation, or stay as a separate configuration.
   - Recommendation: Use the same configured provider. If no provider is configured, key generation is disabled too. This keeps the configuration model simple: one provider config, all AI features use it.

2. **Language code mapping between providers**
   - What we know: DeepL uses non-standard codes (e.g., `ZH-HANS` instead of `zh-CN`, `PT-BR` vs `pt-BR`). Google Translate uses standard ISO codes. OpenAI/Claude understand both.
   - What's unclear: The complete set of language code mappings needed.
   - Recommendation: Each provider adapter handles its own code mapping internally. The service always works with ISO 639-1 codes (matching what the project stores). Provider adapters map to their specific format.

3. **What happens to existing Dify-translated content when the provider changes?**
   - What we know: Existing translations are stored as plain text in the database. They are provider-agnostic.
   - What's unclear: Nothing. This is a non-issue.
   - Recommendation: Existing translations are unaffected. The provider config only affects future translations.

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `packages/server/src/service/ai.service.ts` -- current Dify integration, translation prompt, key generation prompt
- Codebase inspection: `packages/server/src/controller/ai.controller.ts` -- current API endpoints
- Codebase inspection: `packages/web/api/ai.ts` -- frontend API client
- Codebase inspection: `packages/web/components/views/projectView/ProjectTokensTab/index.tsx` -- single and batch translate UI flows
- OpenAI API docs -- chat completions, response_format, models list for key validation
- Node.js `crypto` module docs -- AES-256-GCM authenticated encryption

### Secondary (MEDIUM confidence)
- DeepL API v2 documentation -- translate endpoint, language codes, free vs pro endpoint URLs
- Google Cloud Translation API v2 documentation -- basic translation endpoint with API key auth
- Anthropic API documentation -- OpenAI-compatible endpoint for Claude models

### Tertiary (LOW confidence)
- Community patterns for multi-provider AI integration in NestJS applications

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - OpenAI SDK is well-documented; DeepL/Google APIs are simple REST; encryption uses Node.js built-ins
- Architecture: HIGH - Strategy/adapter pattern is textbook; configuration fallback is straightforward; current codebase already has the right structure (separate service + controller)
- Pitfalls: HIGH - Based on direct codebase inspection (hardcoded key found, JSON parsing issue documented in current code with retry logic, batch translation already sequential)

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable domain, provider APIs change slowly)
