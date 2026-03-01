---
phase: 02-database-foundation
plan: 01
subsystem: database
tags: [drizzle-orm, pglite, postgres, postgresql, schema, migration, nestjs]

# Dependency graph
requires:
  - phase: 01-cleanup-branch-setup
    provides: Clean codebase with Mongoose schemas as source of truth for field mapping
provides:
  - Drizzle ORM pgTable schemas for all 7 entities (users, teams, memberships, projects, tokens, token_history, activity_logs)
  - DrizzleModule with conditional PGlite/PostgreSQL provider
  - DrizzleDB type alias for repository consumers
  - Initial migration SQL with all tables, FKs, indexes
  - drizzle-kit configuration for future migration generation
affects: [02-02-repositories, 02-03-integration-tests, 03-auth]

# Tech tracking
tech-stack:
  added: [drizzle-orm, drizzle-kit, "@electric-sql/pglite", postgres]
  patterns: [pgTable schema definition, conditional database provider, dynamic imports for driver loading, "@Global() NestJS module for DI"]

key-files:
  created:
    - packages/server/src/db/schema/users.ts
    - packages/server/src/db/schema/teams.ts
    - packages/server/src/db/schema/memberships.ts
    - packages/server/src/db/schema/projects.ts
    - packages/server/src/db/schema/tokens.ts
    - packages/server/src/db/schema/token-history.ts
    - packages/server/src/db/schema/activity-logs.ts
    - packages/server/src/db/schema/relations.ts
    - packages/server/src/db/schema/index.ts
    - packages/server/src/db/drizzle.provider.ts
    - packages/server/src/db/drizzle.module.ts
    - packages/server/src/db/drizzle.types.ts
    - packages/server/drizzle.config.ts
    - packages/server/src/db/migrations/0000_sleepy_betty_brant.sql
  modified:
    - packages/server/package.json
    - pnpm-lock.yaml
    - .gitignore

key-decisions:
  - "Removed notNull from userId columns with onDelete set null (token_history, activity_logs) to avoid PostgreSQL constraint contradiction"
  - "Used varchar for role/type enums instead of pgEnum for simpler migration path"
  - "Used dynamic imports in DrizzleProvider so only the chosen driver (PGlite or postgres.js) is loaded at runtime"

patterns-established:
  - "pgTable definition pattern: uuid PK with defaultRandom, snake_case DB columns, camelCase TS properties"
  - "Drizzle relations pattern: separate relations.ts file importing all tables"
  - "Conditional provider pattern: check DATABASE_URL prefix to select PGlite vs PostgreSQL"
  - "Type export pattern: export type Entity = typeof table.$inferSelect and NewEntity = typeof table.$inferInsert"

requirements-completed: [DB-01, DB-02, DB-03, DB-04, DB-05]

# Metrics
duration: 5min
completed: 2026-03-01
---

# Phase 2 Plan 1: Drizzle Schema & Migration Summary

**Drizzle ORM schemas for 7 entities with conditional PGlite/PostgreSQL provider and generated initial migration SQL**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-01T12:01:49Z
- **Completed:** 2026-03-01T12:06:46Z
- **Tasks:** 2
- **Files modified:** 17

## Accomplishments

- All 7 entity schemas (users, teams, memberships, projects, tokens, token_history, activity_logs) defined as Drizzle pgTable with correct PostgreSQL types
- DrizzleModule with conditional PGlite/PostgreSQL provider registered as @Global() NestJS module
- Generated initial migration SQL with all CREATE TABLE, ALTER TABLE (FKs), and CREATE INDEX statements
- Drizzle relations defined for the relational query API enabling nested queries

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Drizzle dependencies and create all schema files** - `8af8e5d` (feat)
2. **Task 2: Create DrizzleModule with conditional provider and drizzle-kit config** - `0fafafe` (feat)

## Files Created/Modified

- `packages/server/src/db/schema/users.ts` - User entity with uuid PK, email unique constraint
- `packages/server/src/db/schema/teams.ts` - Team entity with uuid PK
- `packages/server/src/db/schema/memberships.ts` - Membership entity with unique (userId, teamId) constraint, cascade deletes
- `packages/server/src/db/schema/projects.ts` - Project entity with jsonb fields for languages, modules
- `packages/server/src/db/schema/tokens.ts` - Token entity with jsonb translations, project FK
- `packages/server/src/db/schema/token-history.ts` - Normalized token history (was embedded sub-document in Mongoose)
- `packages/server/src/db/schema/activity-logs.ts` - Activity log with composite indexes for query patterns
- `packages/server/src/db/schema/relations.ts` - All entity relationships for Drizzle relational queries
- `packages/server/src/db/schema/index.ts` - Barrel re-exports of all schemas, types, and relations
- `packages/server/src/db/drizzle.provider.ts` - Conditional PGlite/PostgreSQL provider with dynamic imports
- `packages/server/src/db/drizzle.module.ts` - @Global() NestJS module exporting DRIZZLE token
- `packages/server/src/db/drizzle.types.ts` - DrizzleDB union type for PGlite and PostgreSQL
- `packages/server/drizzle.config.ts` - drizzle-kit config for migration generation
- `packages/server/src/db/migrations/0000_sleepy_betty_brant.sql` - Initial migration with all 7 tables
- `packages/server/package.json` - Added drizzle-orm, pglite, postgres, drizzle-kit
- `pnpm-lock.yaml` - Updated lockfile
- `.gitignore` - Added PGlite data directory exclusion

## Decisions Made

- **Removed notNull from userId columns with onDelete set null:** The plan specified `onDelete: 'set null'` for userId in token_history and activity_logs (to preserve records when users are deleted), but also specified `notNull`. These are contradictory in PostgreSQL -- set null requires the column to be nullable. Made userId nullable to honor the preservation intent.
- **Used varchar for enum fields:** Role (memberships) and type (activity_logs) use varchar instead of pgEnum, allowing simpler migration and avoiding ALTER TYPE complexity.
- **Dynamic imports for drivers:** DrizzleProvider uses `await import()` so only the selected driver (PGlite or postgres.js) is loaded, avoiding unnecessary bundle inclusion.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed notNull + onDelete set null contradiction**
- **Found during:** Task 1 (Schema creation)
- **Issue:** Plan specified both `.notNull()` and `onDelete: 'set null'` on userId in token_history and activity_logs. PostgreSQL would reject set null on a NOT NULL column.
- **Fix:** Removed `.notNull()` from userId in both tables, making the column nullable to support the set null cascade behavior.
- **Files modified:** `packages/server/src/db/schema/token-history.ts`, `packages/server/src/db/schema/activity-logs.ts`
- **Verification:** Migration generates correctly with nullable user_id columns
- **Committed in:** `8af8e5d` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential fix for database constraint correctness. No scope creep.

## Issues Encountered

- Pre-existing TypeScript error in `src/jwt/strategy.ts` (JWT_SECRET type mismatch) -- not related to schema changes, logged to deferred-items.md

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Schema definitions ready for Plan 02 (repositories) to build CRUD operations on
- DrizzleModule ready to be imported in AppModule when repositories are wired up
- Migration SQL ready for Plan 03 (integration tests) to apply against PGlite

## Self-Check: PASSED

All 15 files verified present. Both task commits (8af8e5d, 0fafafe) verified in git log.

---
*Phase: 02-database-foundation*
*Completed: 2026-03-01*
