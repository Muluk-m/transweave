---
phase: 08-developer-tools
plan: 01
subsystem: auth, api
tags: [api-key, auth-guard, drizzle, nestjs, react, radix-ui]

# Dependency graph
requires:
  - phase: 02-database
    provides: Drizzle ORM schema pattern, BaseRepository, DrizzleModule
  - phase: 03-authentication-teams
    provides: JWT auth, AuthGuard, UserPayload interface, AuthService
provides:
  - API key Drizzle schema (api_keys table) with prefix, hash, scopes, expiration
  - ApiKeyRepository with prefix-based lookup and user join queries
  - ApiKeyService with create, validate, list, delete operations
  - Unified AuthGuard accepting both JWT and qlji_-prefixed API keys
  - ApiKeyController with POST/GET/DELETE endpoints at /api/api-keys
  - Frontend API client (api/api-key.ts) for key management
  - Web UI at /settings/api-keys for creating, listing, and revoking API keys
affects: [08-02 (MCP auth, CLI auth), 08-03 (API docs)]

# Tech tracking
tech-stack:
  added: []
  patterns: [unified-auth-guard, api-key-prefix-based-lookup, show-once-key-pattern]

key-files:
  created:
    - packages/server/src/db/schema/api-keys.ts
    - packages/server/src/repository/api-key.repository.ts
    - packages/server/src/service/api-key.service.ts
    - packages/server/src/controller/api-key.controller.ts
    - packages/server/src/models/schemas/api-key.schema.ts
    - packages/server/src/db/migrations/0002_nasty_blade.sql
    - packages/web/api/api-key.ts
    - packages/web/app/settings/api-keys/page.tsx
    - packages/web/components/views/settingsView/ApiKeysView.tsx
  modified:
    - packages/server/src/db/schema/index.ts
    - packages/server/src/db/schema/relations.ts
    - packages/server/src/db/drizzle.module.ts
    - packages/server/src/jwt/guard.ts
    - packages/server/src/app.module.ts
    - packages/server/src/models/index.ts
    - packages/server/src/modules/database.module.ts

key-decisions:
  - "Used Drizzle ORM + Repository pattern instead of Mongoose (consistent with project's migrated architecture)"
  - "API key prefix is first 13 chars (qlji_ + 8 hex) for efficient DB lookup before hash verification"
  - "AuthGuard rewritten as custom CanActivate (replaces PassportStrategy guard) to support dual auth"
  - "JwtStrategy kept as-is for backward compatibility even though AuthGuard no longer extends it"

patterns-established:
  - "Unified auth: all @UseGuards(AuthGuard) decorators accept both JWT and API keys transparently"
  - "API key show-once: full key returned only at creation, stored as hash, prefix for identification"
  - "Settings views: components in settingsView/ directory, pages in app/settings/"

requirements-completed: [DEV-03, DEV-04]

# Metrics
duration: 7min
completed: 2026-03-01
---

# Phase 8 Plan 01: API Key Management Summary

**Unified auth guard with JWT + API key dual auth, Drizzle schema, CRUD service, and web UI for key lifecycle management**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-01T13:30:03Z
- **Completed:** 2026-03-01T13:37:11Z
- **Tasks:** 2
- **Files modified:** 16

## Accomplishments
- API key schema with Drizzle ORM (api_keys table with prefix, hash, scopes, expiration, cascade delete)
- Unified AuthGuard that transparently accepts both JWT tokens and qlji_-prefixed API keys on all protected endpoints
- Full API key lifecycle: create (with show-once key), list (without hash), validate (prefix lookup + hash verify), delete (ownership enforced)
- Web UI at /settings/api-keys with create form, copy-to-clipboard dialog, key table, and confirmation-based revocation

## Task Commits

Each task was committed atomically:

1. **Task 1: API key schema, service, and unified auth guard** - `2756ede` (feat)
2. **Task 2: API key controller and web UI** - `a7dd01b` (feat)

## Files Created/Modified
- `packages/server/src/db/schema/api-keys.ts` - Drizzle schema for api_keys table
- `packages/server/src/db/migrations/0002_nasty_blade.sql` - Migration creating api_keys table
- `packages/server/src/repository/api-key.repository.ts` - Repository with prefix lookup, user join, ownership delete
- `packages/server/src/service/api-key.service.ts` - CRUD + validate service for API keys
- `packages/server/src/controller/api-key.controller.ts` - REST endpoints at /api/api-keys
- `packages/server/src/jwt/guard.ts` - Rewritten unified auth guard (JWT + API key)
- `packages/server/src/models/schemas/api-key.schema.ts` - Mongoose schema for backward compat
- `packages/server/src/db/schema/relations.ts` - Added apiKeys relation to users
- `packages/server/src/db/drizzle.module.ts` - Registered ApiKeyRepository
- `packages/server/src/app.module.ts` - Registered ApiKeyService + ApiKeyController
- `packages/web/api/api-key.ts` - Frontend API client (create, list, delete)
- `packages/web/app/settings/api-keys/page.tsx` - Settings page wrapper
- `packages/web/components/views/settingsView/ApiKeysView.tsx` - Full key management UI

## Decisions Made
- **Drizzle ORM over Mongoose:** Plan specified Mongoose schema pattern, but the project has fully migrated to Drizzle ORM for all data operations. Using Drizzle ensures consistency with existing services (TokenService, UserService, etc.). Mongoose schema still added for DatabaseModule backward compatibility.
- **Custom CanActivate guard:** Replaced PassportStrategy-based AuthGuard with custom CanActivate implementation. This allows checking the token prefix before routing to API key or JWT validation. All existing @UseGuards(AuthGuard) decorators work unchanged.
- **13-char prefix (qlji_ + 8 hex):** Enables efficient database lookup by prefix before expensive hash verification. Balances uniqueness with display readability.
- **Background lastUsedAt update:** API key validation updates lastUsedAt asynchronously to avoid adding latency to authenticated requests.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used Drizzle ORM instead of Mongoose for ApiKey data layer**
- **Found during:** Task 1 (API key schema creation)
- **Issue:** Plan specified Mongoose schema pattern, but all active services use Drizzle repositories. Using Mongoose would create an inconsistent data layer.
- **Fix:** Created Drizzle schema in db/schema/api-keys.ts, ApiKeyRepository extending BaseRepository, and service using repository pattern. Also created Mongoose schema for DatabaseModule backward compatibility.
- **Files modified:** All new server-side files use Drizzle pattern
- **Verification:** Server compiles cleanly (only pre-existing strategy.ts error remains)
- **Committed in:** 2756ede (Task 1 commit)

**2. [Rule 3 - Blocking] Created ApiKeyController in Task 1 (ahead of Task 2)**
- **Found during:** Task 1 (AppModule registration)
- **Issue:** AppModule imports ApiKeyController which was scheduled for Task 2. Import would fail without the file existing.
- **Fix:** Created the controller file during Task 1 to allow compilation.
- **Files modified:** packages/server/src/controller/api-key.controller.ts
- **Verification:** Server compiles with controller registered
- **Committed in:** 2756ede (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both deviations were necessary for correctness. Drizzle migration ensures consistency with established patterns. Early controller creation prevents compilation failure. No scope creep.

## Issues Encountered
- Pre-existing TypeScript error in jwt/strategy.ts (secretOrKey type) -- documented in project decisions as known issue, not addressed
- Pre-existing Next.js build failure in profile/page.tsx (zodResolver type incompatibility) -- unrelated to API key changes, not addressed

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- AuthGuard now accepts API keys, enabling CLI (08-02) and MCP auth (08-02) to authenticate programmatically
- API key endpoints documented in controller, ready for API reference (08-03)
- Web UI complete, users can generate keys for CLI/MCP use immediately

---
*Phase: 08-developer-tools*
*Completed: 2026-03-01*
