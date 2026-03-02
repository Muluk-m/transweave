---
phase: 11-project-rename
plan: 01
subsystem: infra
tags: [pnpm, monorepo, docker, package-json, rename]

# Dependency graph
requires: []
provides:
  - "Root workspace package renamed to @transweave/manager"
  - "Server package renamed to @transweave/server"
  - "Web package renamed to @transweave/web"
  - "CLI package renamed to transweave with updated bin field"
  - "Dockerfiles updated with --filter flags matching new package names"
affects: [11-02, 11-03, 11-04, 11-05, 11-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "pnpm --filter uses name-based matching in Dockerfiles (@transweave/web, @transweave/server)"
    - "Root package.json scripts use path-based --filter ./packages/* (unchanged pattern)"

key-files:
  created: []
  modified:
    - package.json
    - packages/server/package.json
    - packages/web/package.json
    - packages/cli/package.json
    - packages/web/Dockerfile
    - packages/server/Dockerfile

key-decisions:
  - "CLI bin field updated to 'transweave' -> './bin/transweave.js' (bin file rename deferred to Plan 02)"
  - "Root package.json scripts use path-based --filter ./packages/* which do NOT need changing (only name field changed)"
  - "qlji_ prefix and qlj-i18n-ai-salt remain untouched (load-bearing infrastructure identifiers)"

patterns-established:
  - "pnpm workspace name-based --filter: uses @scope/name for Dockerfiles"
  - "Package scoping: @transweave/* for server/web, unscoped 'transweave' for CLI"

requirements-completed: [REN-01, REN-02]

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 11 Plan 01: Project Rename - Package Names Summary

**All four package.json name fields and two Dockerfile --filter flags migrated from qlj-i18n/nextjs identifiers to @transweave/* scoped names**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-02T03:34:24Z
- **Completed:** 2026-03-02T03:35:35Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Renamed root workspace package from `@qlj/i18n-manager` to `@transweave/manager`
- Renamed server, web, and CLI packages to `@transweave/server`, `@transweave/web`, `transweave`
- Updated CLI bin field from `qlj-i18n` to `transweave` (mapped to `./bin/transweave.js`)
- Updated both Dockerfiles: `--filter nextjs` and `--filter qlj-i18n-server` replaced with correct scoped names
- Zero old identifiers remain in all 6 modified files (verified by grep)

## Task Commits

Each task was committed atomically:

1. **Task 1: Update root and server package.json names** - `b41731f` (feat)
2. **Task 2: Update web and CLI package.json names and CLI bin field** - `5a02bb7` (feat)
3. **Task 3: Update Dockerfile --filter flags to match new package names** - `2e307a7` (feat)

## Files Created/Modified
- `package.json` - Root workspace: `@qlj/i18n-manager` -> `@transweave/manager` (name field only, scripts untouched)
- `packages/server/package.json` - `qlj-i18n-server` -> `@transweave/server`
- `packages/web/package.json` - `nextjs` -> `@transweave/web`
- `packages/cli/package.json` - name: `qlj-i18n` -> `transweave`, description updated, bin field updated
- `packages/web/Dockerfile` - Two `--filter nextjs` occurrences -> `--filter @transweave/web`
- `packages/server/Dockerfile` - `--filter qlj-i18n-server` -> `--filter @transweave/server`

## Decisions Made
- CLI bin file rename (`qlj-i18n.js` -> `transweave.js`) deferred to Plan 02 as per plan design — package.json reference updated now, file rename happens in Plan 02
- Root package.json scripts use path-based `--filter ./packages/*` which do not need updating (only the `name` field was changed)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 4 package names are now Transweave-branded and consistent
- Dockerfiles reference correct package names via pnpm --filter
- Plan 02 can proceed to rename the CLI bin file (`bin/qlj-i18n.js` -> `bin/transweave.js`) and update internal references

## Self-Check: PASSED

- All 6 modified files verified present
- All 3 task commits verified in git log (b41731f, 5a02bb7, 2e307a7)
- Zero old package names found in any of the 6 files

---
*Phase: 11-project-rename*
*Completed: 2026-03-02*
