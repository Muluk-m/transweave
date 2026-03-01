---
phase: 03-authentication-teams
plan: 01
subsystem: auth
tags: [jwt, nestjs, drizzle, repository-pattern, admin, setup]

# Dependency graph
requires:
  - phase: 02-database-foundation
    provides: Drizzle schema, UserRepository, BaseRepository, DrizzleModule
provides:
  - Repository-backed auth service (register, login, setup)
  - Repository-backed user service (CRUD, getUserCount, resetPassword, isAdmin)
  - First-run setup endpoint (GET setup/status, POST setup)
  - Admin password reset endpoint (PUT :id/reset-password)
  - DB-backed admin check replacing hardcoded email list
  - isAdmin and loginProvider columns in users schema
affects: [03-authentication-teams, 04-frontend-auth, 05-service-migration]

# Tech tracking
tech-stack:
  added: []
  patterns: [forwardRef for circular DI, DB-backed admin role check]

key-files:
  created:
    - packages/server/src/db/migrations/0001_organic_skullbuster.sql
  modified:
    - packages/server/src/service/auth.service.ts
    - packages/server/src/service/user.service.ts
    - packages/server/src/controller/auth.controller.ts
    - packages/server/src/controller/user.controller.ts
    - packages/server/src/controller/team.controller.ts
    - packages/server/src/repository/user.repository.ts
    - packages/server/src/db/schema/users.ts
    - packages/server/src/app.module.ts

key-decisions:
  - "Used forwardRef(() => TeamService) in AuthService to handle circular DI for setup endpoint"
  - "Added isAdmin and loginProvider columns to users schema (pulled forward from Task 3 into Task 1 for compilation)"
  - "Slugified team name for URL in setup endpoint using regex replace"

patterns-established:
  - "DB-backed admin check: userService.isAdmin(userId) replaces hardcoded email list everywhere"
  - "Register returns JWT token alongside user data for immediate auth after registration"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06]

# Metrics
duration: 6min
completed: 2026-03-01
---

# Phase 3 Plan 1: Auth Migration Summary

**Repository-backed auth with Feishu removal, first-run setup endpoint, and DB-backed admin role checks**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-01T12:40:45Z
- **Completed:** 2026-03-01T12:47:00Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments
- Complete Feishu OAuth removal from auth and user services (zero references remaining in server/src)
- Repository-backed user service with getUserCount, resetPassword, isAdmin methods
- First-run setup endpoint that creates admin user + default team when DB is empty
- Admin password reset endpoint with DB-backed admin check and self-reset protection
- Team controller uses DB-backed admin role instead of hardcoded email list
- Managers can update member roles (member/manager only, not owner) per TEAM-04

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate auth and user services to repositories, remove Feishu** - `9eab67d` (feat)
2. **Task 2: Add admin password reset endpoint and update team controller admin check** - `c9715bd` (feat)
3. **Task 3: Ensure isAdmin column exists in users Drizzle schema** - `a09e0e6` (chore)

## Files Created/Modified
- `packages/server/src/service/auth.service.ts` - Auth service: register returns JWT, setup() creates admin+team, no Feishu
- `packages/server/src/service/user.service.ts` - User service: full rewrite using UserRepository, added getUserCount/resetPassword/isAdmin
- `packages/server/src/controller/auth.controller.ts` - Auth controller: added GET setup/status and POST setup endpoints
- `packages/server/src/controller/user.controller.ts` - User controller: added PUT :id/reset-password with admin guard
- `packages/server/src/controller/team.controller.ts` - Team controller: replaced isSuperAdmin with DB-backed isAdmin check
- `packages/server/src/repository/user.repository.ts` - User repository: added count(), search(), findByName() methods
- `packages/server/src/db/schema/users.ts` - Users schema: added isAdmin boolean and loginProvider text columns
- `packages/server/src/app.module.ts` - App module: imported DrizzleModule for repository DI
- `packages/server/src/db/migrations/0001_organic_skullbuster.sql` - Migration: ALTER TABLE add login_provider and is_admin
- `packages/server/src/utils/superAdmin.ts` - DELETED: hardcoded email list no longer needed

## Decisions Made
- Used `forwardRef(() => TeamService)` in AuthService constructor to handle circular dependency (AuthService needs TeamService for setup, TeamService is in same module)
- Pulled isAdmin/loginProvider schema changes into Task 1 (from Task 3) because TypeScript compilation required them immediately
- Slugified team name for URL using regex `toLowerCase().replace(/[^a-z0-9]+/g, '-')` in setup endpoint
- Kept HttpModule in AppModule because AiService still uses it
- Kept DatabaseModule (Mongoose) in AppModule because TeamService and other services still use Mongoose models

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added isAdmin and loginProvider to schema in Task 1**
- **Found during:** Task 1 (auth service migration)
- **Issue:** auth.service.ts passes `loginProvider` and `isAdmin` to createUser, but users schema lacked these columns. TypeScript would not compile.
- **Fix:** Added `loginProvider: text('login_provider').notNull().default('local')` and `isAdmin: boolean('is_admin').notNull().default(false)` to users schema immediately in Task 1.
- **Files modified:** packages/server/src/db/schema/users.ts
- **Verification:** `npx tsc --noEmit` passes for all plan-modified files
- **Committed in:** 9eab67d (Task 1 commit)

**2. [Rule 3 - Blocking] Imported DrizzleModule in AppModule**
- **Found during:** Task 1 (auth service migration)
- **Issue:** DrizzleModule (containing UserRepository and other repositories) was defined with @Global() decorator but never imported in AppModule, so DI would fail at runtime.
- **Fix:** Added `DrizzleModule` to AppModule imports array.
- **Files modified:** packages/server/src/app.module.ts
- **Verification:** Module compiles, DrizzleModule provides repositories via @Global()
- **Committed in:** 9eab67d (Task 1 commit)

**3. [Rule 3 - Blocking] Added count(), search(), findByName() to UserRepository**
- **Found during:** Task 1 (user service migration)
- **Issue:** BaseRepository lacks count(), search(), findByName() methods needed by the new UserService methods getUserCount(), searchUsers(), validateUser().
- **Fix:** Added three methods to UserRepository: count() using SQL count(*), search() using ILIKE with limit 10, findByName() using eq().
- **Files modified:** packages/server/src/repository/user.repository.ts
- **Verification:** TypeScript compiles, methods match UserService delegation patterns
- **Committed in:** 9eab67d (Task 1 commit)

---

**Total deviations:** 3 auto-fixed (all Rule 3 - blocking issues)
**Impact on plan:** All auto-fixes were necessary for compilation. Task 3 became a verification-only task since schema changes were pulled forward. No scope creep.

## Issues Encountered
- Pre-existing `jwt/strategy.ts` TypeScript error (secretOrKey type mismatch) remains. This was documented as out of scope in Phase 2 STATE.md and is unrelated to auth migration work.
- Uncommitted changes from prior sessions (membership.service.ts migration, upload.ts rewrite) were on disk. These were not staged for this plan's commits except where they intersected with plan scope.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Auth API surface complete: register, login, setup, password reset all backed by Drizzle repositories
- TeamService and other services still use Mongoose - will be migrated in subsequent plans (03-02, 03-03)
- Frontend can now build against these endpoints for auth pages
- Pre-existing jwt/strategy.ts TS error should be fixed in a future cleanup task

## Self-Check: PASSED

All files verified present. All 3 commits verified in git log. superAdmin.ts confirmed deleted.

---
*Phase: 03-authentication-teams*
*Completed: 2026-03-01*
