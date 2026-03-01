# Phase 8: Developer Tools - Research

**Researched:** 2026-03-01
**Domain:** CLI tooling, MCP server integration, API key management, REST API documentation
**Confidence:** HIGH

## Summary

Phase 8 delivers programmatic access to the i18n platform through four complementary channels: API key management (enabling machine-to-machine auth), a CLI tool for pull/push workflows, an enhanced MCP server for AI coding assistants, and REST API documentation. The codebase already has a working MCP server (`McpService` + `McpController`) with four tools (list_projects, list_project_tokens, get_token_details, create_token) using `@modelcontextprotocol/sdk 1.25.2` with Streamable HTTP transport. The existing REST API is well-structured (NestJS controllers with JWT auth via Passport), but lacks API key authentication and has no formal documentation.

The critical architectural insight is that API key management is the foundation for everything else. The CLI needs API keys to authenticate without interactive login. The MCP server currently has zero authentication (uses a hardcoded system user ID `000000000000000000000000`), which must be replaced with proper API key auth. The REST API documentation is a catalog of what already exists plus the new endpoints added in this phase.

The CLI tool should be a lightweight Node.js package in the monorepo (`packages/cli`) using Commander.js, publishing as `qlj-i18n` on npm. It wraps the REST API with two core commands: `pull` (download translations to local files) and `push` (upload local files to server). Configuration lives in a `.qlj-i18n.json` project config file.

**Primary recommendation:** Build API key management first (schema + service + controller + UI), then extend MCP with auth and update_token tool, then build CLI on top of the authenticated API, and finally generate API documentation from the existing controllers.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DEV-01 | CLI tool can pull translations from server to local files | Commander.js CLI in `packages/cli`, wraps `GET /api/project/download/:projectId` endpoint with API key auth |
| DEV-02 | CLI tool can push local translation files to server | CLI wraps `POST /api/project/import/:projectId` endpoint, reads local files and sends content |
| DEV-03 | CLI authenticates via API key | API key sent as `Authorization: Bearer apikey_xxx` or `X-API-Key` header; JwtStrategy extended to also accept API keys |
| DEV-04 | User can generate and manage API keys from web UI | New `ApiKey` database entity, `ApiKeyService`, `ApiKeyController`, and frontend settings page |
| DEV-05 | MCP server allows AI coding assistants to list projects and tokens | Already exists: `list_projects`, `list_project_tokens`, `get_token_details` tools. Need: API key auth on MCP endpoint |
| DEV-06 | MCP server allows AI coding assistants to create and update tokens | `create_token` exists. Need: `update_token` tool added to McpService. Auth via API key |
| DEV-07 | REST API documented with endpoint reference | Generate Markdown reference from existing controllers; document all endpoints with request/response examples |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| commander | 13.x | CLI framework | Most popular Node.js CLI framework; used by Vue CLI, Angular CLI, webpack-cli. Minimal, well-documented |
| @modelcontextprotocol/sdk | 1.25.2 | MCP server | Already in use. Official MCP SDK with Streamable HTTP transport |
| crypto (Node built-in) | N/A | API key generation | `crypto.randomBytes(32).toString('hex')` for secure key generation. No external dependency needed |
| bcrypt (already in project) | N/A | API key hashing | Hash API keys at rest (store hash, not plaintext). Already used for password hashing |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| chalk | 5.x | CLI colored output | Terminal output formatting in CLI tool |
| ora | 8.x | CLI spinners | Progress indication during pull/push operations |
| cosmiconfig | 9.x | CLI config loading | Load `.qlj-i18n.json` or `qlj-i18n.config.js` config files |
| conf | 13.x | CLI global config | Store API key and server URL in user home directory (`~/.config/qlj-i18n/`) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| commander | yargs | yargs is more feature-rich but heavier; commander is simpler for pull/push pattern |
| Markdown API docs | Swagger/OpenAPI + @nestjs/swagger | Swagger adds runtime overhead and complexity; Markdown is simpler for v1, can add Swagger later |
| cosmiconfig | manual JSON parse | cosmiconfig handles multiple config file formats and directory traversal; worth the small dependency |
| conf (global config) | dotenv file | conf provides XDG-compliant storage location; dotenv requires file in each project |

**Installation:**
```bash
# Server-side (API key support)
# No new dependencies needed - uses existing crypto, bcrypt, and NestJS modules

# CLI package (new package in monorepo)
pnpm --filter packages/cli add commander chalk ora cosmiconfig conf
```

## Architecture Patterns

### Recommended Project Structure
```
packages/
├── server/
│   └── src/
│       ├── models/schemas/
│       │   └── api-key.schema.ts      # New: API key Mongoose schema
│       ├── service/
│       │   ├── api-key.service.ts      # New: API key CRUD + validation
│       │   └── mcp.service.ts          # Modified: add update_token, auth context
│       ├── controller/
│       │   ├── api-key.controller.ts   # New: API key management endpoints
│       │   └── mcp.controller.ts       # Modified: add API key auth
│       ├── jwt/
│       │   ├── guard.ts                # Modified: accept both JWT and API key
│       │   └── api-key.guard.ts        # New: API-key-only guard for MCP
│       └── ...
├── cli/                                # New package
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts                    # CLI entry point
│   │   ├── commands/
│   │   │   ├── pull.ts                 # Pull translations command
│   │   │   ├── push.ts                 # Push translations command
│   │   │   ├── init.ts                 # Initialize project config
│   │   │   └── login.ts               # Save API key to global config
│   │   ├── config.ts                   # Config file loading
│   │   ├── api-client.ts              # HTTP client for server API
│   │   └── utils.ts                   # Shared utilities
│   └── bin/
│       └── qlj-i18n.js                # Bin entry
└── web/
    └── app/
        └── settings/
            └── api-keys/               # New: API key management UI page
                └── page.tsx
```

### Pattern 1: API Key Authentication (Dual Auth Strategy)
**What:** Extend the existing JWT Passport strategy to also accept API keys. API keys use a different prefix (`apikey_`) to distinguish from JWTs. The guard checks the `Authorization` header: if the token starts with `apikey_`, validate against the API key table; otherwise, validate as JWT.
**When to use:** All authenticated endpoints should accept both JWT (web UI) and API key (CLI, MCP, external integrations).
**Example:**
```typescript
// Unified auth guard that accepts both JWT and API key
@Injectable()
export class UnifiedAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private apiKeyService: ApiKeyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) return false;

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer') return false;

    if (token.startsWith('qlji_')) {
      // API key auth
      const apiKey = await this.apiKeyService.validateKey(token);
      if (!apiKey) return false;
      request.user = {
        userId: apiKey.userId,
        email: apiKey.userEmail,
        name: apiKey.userName,
        avatar: '',
        authType: 'api_key',
      };
      return true;
    }

    // Fall back to JWT validation
    try {
      const payload = this.jwtService.verify(token);
      request.user = payload;
      return true;
    } catch {
      return false;
    }
  }
}
```

### Pattern 2: API Key Schema Design
**What:** API keys are stored as hashed values with metadata (name, scopes, expiration, last used). The full key is shown once at creation and never stored.
**When to use:** When implementing DEV-04.
**Example:**
```typescript
// API Key entity fields
{
  id: string;           // UUID primary key
  name: string;         // User-given label e.g. "CI/CD Pipeline"
  keyPrefix: string;    // First 8 chars of the key for identification: "qlji_abc1"
  keyHash: string;      // bcrypt hash of the full key
  userId: string;       // Owner foreign key
  scopes: string[];     // Permission scopes: ["read", "write"] or ["*"]
  expiresAt: Date | null; // Optional expiration
  lastUsedAt: Date | null;
  createdAt: Date;
}
// Key format: qlji_{32 random hex chars} (e.g., qlji_a1b2c3d4e5f6...)
// Prefix "qlji_" makes keys identifiable in secret scanners
```

### Pattern 3: CLI Configuration
**What:** The CLI uses two levels of configuration: global (stored in `~/.config/qlj-i18n/config.json` for API key and server URL) and project-level (`.qlj-i18n.json` in project root for project ID, languages, output paths).
**When to use:** When implementing DEV-01, DEV-02, DEV-03.
**Example:**
```json
// ~/.config/qlj-i18n/config.json (global)
{
  "server": "https://i18n.example.com",
  "apiKey": "qlji_a1b2c3d4e5f6..."
}

// .qlj-i18n.json (project-level)
{
  "projectId": "uuid-of-project",
  "outputDir": "./src/locales",
  "format": "json",
  "languages": ["en", "zh-CN", "ja"]
}
```

### Pattern 4: MCP Server Authentication
**What:** The MCP controller adds API key validation before processing MCP requests. The API key is passed in the initial HTTP request headers. This replaces the hardcoded system user ID (`000000000000000000000000`).
**When to use:** When implementing DEV-05, DEV-06.
**Example:**
```typescript
// MCP Controller with auth
@All()
async handleMcp(@Req() req: Request, @Res() res: Response) {
  // Extract API key from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer qlji_')) {
    return res.status(401).json({ error: 'API key required' });
  }

  const apiKey = await this.apiKeyService.validateKey(authHeader.split(' ')[1]);
  if (!apiKey) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  // Store user context for MCP tools to use
  req['mcpUser'] = { userId: apiKey.userId, ... };

  // ... existing transport handling
}
```

### Anti-Patterns to Avoid
- **Storing API keys in plaintext:** Always hash with bcrypt. Only show the full key once at creation time.
- **Embedding API key in CLI source code:** Use config files or environment variables, never hardcode.
- **Building a custom HTTP client for CLI:** Use the existing `fetch` API (Node 18+) or axios. Do not hand-roll request handling.
- **Adding auth to MCP at the tool level:** Auth should be at the transport/controller level, not checked in each tool handler.
- **Generating API docs manually:** Derive docs from actual controller code/decorators. Manual docs drift from reality.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CLI argument parsing | Custom argv parser | commander 13.x | Handles subcommands, options, help text, validation |
| Config file discovery | Manual file traversal | cosmiconfig 9.x | Searches parent dirs, supports multiple formats |
| Secure random key generation | Math.random() | crypto.randomBytes(32) | Cryptographically secure, uniform distribution |
| API key hashing | Simple SHA-256 | bcrypt (already in project) | Deliberately slow, prevents brute-force attacks on leaked hashes |
| Terminal progress | console.log | ora 8.x | Proper spinners, handles terminal redraws cleanly |
| OpenAPI spec generation | Manual JSON | @nestjs/swagger (if adding later) | Auto-generates from decorators, stays in sync |

**Key insight:** The CLI is thin -- it is just a wrapper around HTTP calls to the existing REST API. Do not duplicate business logic in the CLI. All intelligence lives server-side.

## Common Pitfalls

### Pitfall 1: API Key Shown After Creation Cannot Be Retrieved
**What goes wrong:** User creates an API key but closes the dialog before copying it. Key is hashed server-side and cannot be recovered.
**Why it happens:** Security best practice (hash, don't store plaintext) creates UX friction.
**How to avoid:** 1) Show the key prominently in a modal with a "Copy" button. 2) Warn the user explicitly: "This key will only be shown once." 3) Provide a `qlj-i18n login` CLI command that accepts the key and stores it securely.
**Warning signs:** Users repeatedly creating and immediately revoking keys.

### Pitfall 2: MCP Server Has No Auth (Current State)
**What goes wrong:** The current MCP controller at `/api/mcp` accepts all requests without authentication. The `createToken` tool uses a hardcoded fake user ID `000000000000000000000000`.
**Why it happens:** MCP was built as an internal tool without external access concerns.
**How to avoid:** Add API key authentication to the MCP controller. Pass the authenticated user context to MCP tool handlers so they operate as the correct user with proper permissions.
**Warning signs:** Tokens created via MCP have no real owner; activity logs show a fake user.

### Pitfall 3: CLI Config Contains Secret (API Key)
**What goes wrong:** Users commit `.qlj-i18n.json` to git with their API key embedded, leaking credentials.
**How to avoid:** 1) Store API key in global config (`~/.config/qlj-i18n/`) separate from project config. 2) Project-level `.qlj-i18n.json` contains only non-secret data (project ID, output dir, format). 3) Support `QLJ_I18N_API_KEY` environment variable for CI/CD. 4) Add `.qlj-i18n.json` guidance to documentation (do not store secrets).
**Warning signs:** Secret scanners flagging `qlji_` prefixed strings in git repos.

### Pitfall 4: CLI Pull/Push Format Mismatch
**What goes wrong:** User pulls translations in JSON format, edits them, then pushes expecting the server to auto-detect the format. Server rejects or misparses.
**How to avoid:** 1) Store the format in project config (`.qlj-i18n.json`). 2) CLI uses the same format for both pull and push. 3) Validate file extension matches configured format before pushing.
**Warning signs:** Import errors after push, translations appearing garbled.

### Pitfall 5: REST API Documentation Drifts from Implementation
**What goes wrong:** API docs are written once and never updated. New endpoints or parameter changes are not reflected.
**Why it happens:** Documentation is a separate artifact from code.
**How to avoid:** For v1, write the API reference as a Markdown file generated from inspecting the actual controller decorators and method signatures. Include a note about which phase/version the docs cover. Consider `@nestjs/swagger` for v2 to auto-generate.
**Warning signs:** Users reporting "endpoint not found" errors when following documentation.

## Code Examples

### API Key Generation and Validation
```typescript
import * as crypto from 'crypto';
import { hashPassword, verifyPassword } from '../utils/crypto';

// Generate a new API key
function generateApiKey(): { key: string; prefix: string; hash: string } {
  const randomPart = crypto.randomBytes(32).toString('hex');
  const key = `qlji_${randomPart}`;
  const prefix = key.substring(0, 13); // "qlji_" + first 8 hex chars
  const hash = hashPassword(key); // bcrypt hash
  return { key, prefix, hash };
}

// Validate an API key against stored hash
async function validateApiKey(providedKey: string, storedHash: string): Promise<boolean> {
  return verifyPassword(providedKey, storedHash);
}
```

### CLI Pull Command
```typescript
import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';

const pullCommand = new Command('pull')
  .description('Download translations from server to local files')
  .option('-f, --format <format>', 'Output format (json|yaml)', 'json')
  .option('-o, --output <dir>', 'Output directory', './src/locales')
  .option('-l, --languages <langs...>', 'Languages to pull (default: all)')
  .action(async (options) => {
    const config = await loadConfig();
    const apiClient = createApiClient(config.server, config.apiKey);

    // Fetch project to get available languages
    const project = await apiClient.get(`/api/project/find/${config.projectId}`);
    const languages = options.languages || project.languages;

    // Download translations per language
    for (const lang of languages) {
      const response = await apiClient.get(
        `/api/project/download/${config.projectId}?format=${options.format}&languages=${lang}`
      );
      const outputPath = path.join(options.output, `${lang}.${options.format}`);
      await fs.writeFile(outputPath, response);
      console.log(`  Pulled ${lang} -> ${outputPath}`);
    }
  });
```

### MCP update_token Tool Registration
```typescript
// Add to McpService.registerTools()
const updateTokenSchema = z.object({
  tokenId: z.string().describe('Token ID to update'),
  translations: z.record(z.string()).optional().describe('Updated translations'),
  key: z.string().optional().describe('Updated token key'),
  module: z.string().optional().describe('Updated module code'),
  tags: z.array(z.string()).optional().describe('Updated tags'),
  comment: z.string().optional().describe('Updated comment'),
});

registerTool(
  'update_token',
  {
    title: 'Update Token',
    description: 'Update an existing translation token',
    inputSchema: updateTokenSchema,
  },
  async (params) => {
    const token = await this.projectService.updateToken(params.tokenId, {
      ...params,
      userId: this.currentUserId, // From auth context
    });
    return {
      content: [{ type: 'text', text: JSON.stringify(token, null, 2) }],
    };
  },
);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MCP stdio transport | Streamable HTTP transport | MCP SDK 1.25+ (2025) | Already using current approach. Enables web-based MCP access without subprocess management |
| API key in query params | API key in Authorization header | Industry standard | Never put secrets in URLs (logged by proxies/servers). Use Bearer token header |
| Hand-written OpenAPI YAML | NestJS Swagger decorators or Markdown | Ongoing | For v1, Markdown is sufficient. Swagger can be added in v2 for auto-generation |
| CLI stdio for config | XDG-compliant config directories | 2020s convention | Use `~/.config/qlj-i18n/` on Linux/macOS. `conf` library handles this cross-platform |

**Deprecated/outdated:**
- MCP SSE transport: Replaced by Streamable HTTP in MCP SDK 1.25+. The codebase already uses the current approach.
- API keys as URL query parameters: Security anti-pattern. Always use headers.

## Open Questions

1. **API key scoping granularity**
   - What we know: API keys need scopes (read, write). The CLI needs read+write. MCP needs read+write.
   - What's unclear: Should scopes be per-project or global? Per-project is more secure but more complex.
   - Recommendation: Start with global scopes (read, write, admin). Add per-project scoping in v2 if users request it. This keeps the schema simple.

2. **CLI distribution method**
   - What we know: CLI is a Node.js package. Can be published to npm as `qlj-i18n`.
   - What's unclear: Should CLI be installable standalone via npx, or only via npm install?
   - Recommendation: Support both `npx qlj-i18n pull` and `npm install -g qlj-i18n`. The `bin` field in package.json enables both.

3. **REST API versioning**
   - What we know: Current endpoints are at `/api/...` with no version prefix.
   - What's unclear: Should we add `/api/v1/...` versioning now?
   - Recommendation: Do NOT add versioning in Phase 8. The API is not yet stable (prior phases may still be changing it). Add versioning when the API is frozen for external consumers. Document current endpoints as "v1" in docs but keep the URL paths as-is.

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `packages/server/src/service/mcp.service.ts` - current MCP implementation with 4 tools
- Codebase inspection: `packages/server/src/controller/mcp.controller.ts` - Streamable HTTP transport, session management
- Codebase inspection: `packages/server/src/jwt/guard.ts` and `strategy.ts` - current JWT auth pattern
- Codebase inspection: `packages/server/src/controller/project.controller.ts` - existing REST API endpoints for download/import
- Codebase inspection: `packages/server/src/service/auth.service.ts` - existing auth patterns, password hashing

### Secondary (MEDIUM confidence)
- Commander.js is the standard CLI framework for Node.js (used by major CLI tools)
- MCP SDK Streamable HTTP is the current transport standard (SDK 1.25+)
- API key prefix patterns (e.g., `sk_live_`, `ghp_`) are industry standard for key identification
- bcrypt for API key hashing is recommended by OWASP

### Tertiary (LOW confidence)
- Specific cosmiconfig and conf library version numbers should be verified against npm at implementation time

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries are well-established. MCP SDK already in use. Commander.js is industry standard.
- Architecture: HIGH - Patterns are straightforward (API key table, auth guard extension, CLI wrapper). Based on actual codebase analysis.
- Pitfalls: HIGH - Identified from actual codebase inspection (hardcoded MCP user ID, missing MCP auth, existing download endpoint).

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable domain, patterns unlikely to change)
