---
phase: 07-ai-translation
plan: 01
subsystem: ai
tags: [openai, claude, deepl, google-translate, aes-256-gcm, encryption, nestjs, provider-pattern]

# Dependency graph
requires:
  - phase: 02-database
    provides: Drizzle schema, repositories (Team, Project), DrizzleModule
  - phase: 03-authentication-teams
    provides: AuthGuard, CurrentUser decorator, JWT auth
provides:
  - TranslationProvider interface with 4 provider adapters
  - Provider factory with LLM detection
  - AES-256-GCM API key encryption/decryption
  - AiConfigService with project->team fallback chain
  - AiModule (AiService, AiConfigService, controllers)
  - Config CRUD endpoints (GET/PUT/DELETE for team and project)
affects: [07-02-ai-frontend, 08-developer-tools]

# Tech tracking
tech-stack:
  added: [openai, p-queue]
  patterns: [provider-adapter, strategy-pattern, config-fallback-chain, lazy-dynamic-import, encrypted-at-rest]

key-files:
  created:
    - packages/server/src/ai/providers/translation-provider.interface.ts
    - packages/server/src/ai/providers/openai.provider.ts
    - packages/server/src/ai/providers/claude.provider.ts
    - packages/server/src/ai/providers/deepl.provider.ts
    - packages/server/src/ai/providers/google-translate.provider.ts
    - packages/server/src/ai/providers/provider-factory.ts
    - packages/server/src/ai/providers/prompt.ts
    - packages/server/src/ai/providers/json-extract.ts
    - packages/server/src/ai/encryption.util.ts
    - packages/server/src/ai/ai.service.ts
    - packages/server/src/ai/ai-config.service.ts
    - packages/server/src/ai/ai.controller.ts
    - packages/server/src/ai/ai-config.controller.ts
    - packages/server/src/ai/ai.module.ts
  modified:
    - packages/server/src/db/schema/teams.ts
    - packages/server/src/db/schema/projects.ts
    - packages/server/src/app.module.ts

key-decisions:
  - "Used OpenAI SDK for both OpenAI and Claude providers (Claude is OpenAI-compatible)"
  - "Lazy dynamic import for OpenAI SDK to avoid loading at startup when AI not configured"
  - "Added json-extract.ts utility for robust JSON parsing from LLM responses (code block stripping)"
  - "Used 'as any' cast for aiConfig repository updates since JSONB column is new and type not inferred"

patterns-established:
  - "Provider adapter pattern: each AI provider implements TranslationProvider interface"
  - "Config fallback chain: project-level config overrides team-level, null means disabled"
  - "API key masking: maskApiKey() returns '...last4' for all API responses"
  - "Encrypted at rest: AES-256-GCM with scrypt-derived key from AI_ENCRYPTION_KEY env var"

requirements-completed: [AI-01, AI-02, AI-03, AI-04, AI-05]

# Metrics
duration: 6min
completed: 2026-03-01
---

# Phase 7 Plan 01: Multi-provider AI Translation Backend Summary

**Provider adapter pattern with 4 providers (OpenAI, Claude, DeepL, Google Translate), AES-256-GCM encrypted API keys, project->team config fallback chain replacing hardcoded Dify integration**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-01T13:30:01Z
- **Completed:** 2026-03-01T13:36:00Z
- **Tasks:** 2
- **Files modified:** 17

## Accomplishments
- Replaced Dify-hardcoded AI service with flexible multi-provider system (4 adapters)
- API keys encrypted at rest using AES-256-GCM, never exposed in API responses
- Configuration fallback chain: project-level overrides team-level, fully optional
- Preserved existing API contract (/api/ai/translate, /api/ai/generate/key) for frontend compatibility
- Added config management endpoints (GET/PUT/DELETE for team and project AI config)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create provider interface, adapters, encryption, and shared prompt** - `7c4222b` (feat)
2. **Task 2: AI service rewrite with config management, fallback chain, and updated controller** - `c6279fd` (feat)

## Files Created/Modified
- `packages/server/src/ai/providers/translation-provider.interface.ts` - TranslationProvider interface, ProviderConfig, AiConfigDto, AiConfigStored types
- `packages/server/src/ai/providers/openai.provider.ts` - OpenAI adapter with lazy SDK import, JSON response format
- `packages/server/src/ai/providers/claude.provider.ts` - Claude adapter via OpenAI-compatible endpoint
- `packages/server/src/ai/providers/deepl.provider.ts` - DeepL adapter with free/pro URL detection
- `packages/server/src/ai/providers/google-translate.provider.ts` - Google Translate v2 adapter
- `packages/server/src/ai/providers/provider-factory.ts` - Factory function and LLM detection
- `packages/server/src/ai/providers/prompt.ts` - Shared translation and key generation prompts
- `packages/server/src/ai/providers/json-extract.ts` - JSON extraction from markdown code blocks
- `packages/server/src/ai/encryption.util.ts` - AES-256-GCM encrypt/decrypt/mask for API keys
- `packages/server/src/ai/ai.service.ts` - AI translation orchestrator with config resolution
- `packages/server/src/ai/ai-config.service.ts` - CRUD for AI provider configuration
- `packages/server/src/ai/ai.controller.ts` - Translation and key generation endpoints
- `packages/server/src/ai/ai-config.controller.ts` - Config management endpoints
- `packages/server/src/ai/ai.module.ts` - NestJS module exporting AI services
- `packages/server/src/db/schema/teams.ts` - Added aiConfig JSONB column
- `packages/server/src/db/schema/projects.ts` - Added aiConfig JSONB column
- `packages/server/src/app.module.ts` - Replaced old AiService/AiController with AiModule import

## Decisions Made
- Used OpenAI SDK for both OpenAI and Claude providers since Claude supports OpenAI-compatible API
- Lazy dynamic import for OpenAI SDK (`await import('openai')`) so no provider SDKs load at startup
- Created json-extract.ts utility for robust JSON parsing from LLM responses that may include markdown code blocks
- Used `as any` cast for aiConfig repository updates because the JSONB column type is not automatically inferred in the existing generic BaseRepository

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added JSON extraction utility**
- **Found during:** Task 1 (OpenAI provider)
- **Issue:** Plan mentioned JSON parse failure handling but did not specify a dedicated utility. LLMs frequently wrap JSON in markdown code blocks.
- **Fix:** Created `json-extract.ts` with multi-strategy JSON extraction (direct parse, code block extraction, regex match)
- **Files modified:** `packages/server/src/ai/providers/json-extract.ts`
- **Verification:** Used by both OpenAI and Claude providers
- **Committed in:** 7c4222b (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for reliable JSON parsing from LLM responses. No scope creep.

## Issues Encountered
None

## User Setup Required

Users need to set `AI_ENCRYPTION_KEY` environment variable (generate with `openssl rand -hex 32`) before storing AI provider API keys. The platform operates fully without this variable -- AI features are simply disabled. See plan frontmatter `user_setup` for details.

## Next Phase Readiness
- Backend AI module complete, ready for 07-02 frontend integration
- Config endpoints available for settings UI to consume
- All endpoints accept projectId parameter for frontend to pass through

## Self-Check: PASSED

All 14 created files verified present. Both task commits (7c4222b, c6279fd) verified in git log.

---
*Phase: 07-ai-translation*
*Completed: 2026-03-01*
