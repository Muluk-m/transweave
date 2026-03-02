---
phase: 11-project-rename
plan: "04"
subsystem: infra
tags: [docker, docker-compose, volumes, transweave, rename]

# Dependency graph
requires:
  - phase: 11-project-rename/11-01
    provides: Package names renamed to Transweave; Dockerfiles updated
provides:
  - Docker Compose volumes with explicit Transweave-branded names (transweave-pgdata, transweave-uploads)
affects: [docker, deployment, data-migration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Explicit Docker volume naming: name: field prevents implicit project-prefix naming"

key-files:
  created: []
  modified:
    - docker-compose.yml

key-decisions:
  - "Added WARNING comments to each volume's name: field to alert future developers of data migration risk when switching from implicit to explicit volume names"
  - "Service keys (postgres, server, web) deliberately left unchanged — they are internal Docker service identifiers, not brand-facing names"
  - "Human checkpoint required before applying change — data migration risk is non-trivial for anyone with existing volumes"

patterns-established:
  - "Docker volume naming: use name: field for brand-consistent, project-prefix-independent volume names"

requirements-completed: [REN-06]

# Metrics
duration: 5min
completed: 2026-03-02
---

# Phase 11 Plan 04: Docker Compose Volume Rename Summary

**docker-compose.yml volumes explicitly named transweave-pgdata and transweave-uploads with data-migration WARNING comments**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-02T03:15:00Z
- **Completed:** 2026-03-02T03:20:00Z
- **Tasks:** 2 (1 checkpoint, 1 auto)
- **Files modified:** 1

## Accomplishments

- Added `name: transweave-pgdata` to `pgdata` volume in docker-compose.yml
- Added `name: transweave-uploads` to `uploads` volume in docker-compose.yml
- Added WARNING comments above each `name:` field explaining old implicit volume name and data migration risk
- Human checkpoint approved by user confirming no production data in old volumes

## Task Commits

Each task was committed atomically:

1. **Task 1: Checkpoint — Acknowledge Docker volume data migration risk** - (human-approved checkpoint, no commit)
2. **Task 2: Add explicit name fields to Docker Compose volumes** - `a6cf96e` (chore)

**Plan metadata:** (final docs commit — see below)

## Files Created/Modified

- `docker-compose.yml` - Added explicit `name:` fields with WARNING comments to both volumes (`pgdata` and `uploads`)

## Decisions Made

- Service keys (`postgres`, `server`, `web`) deliberately left unchanged — these are internal Docker Compose service identifiers, not brand-facing names
- WARNING comments added above each `name:` field so future developers understand that switching from implicit to explicit volume naming orphans old data
- Human checkpoint gate enforced before applying this breaking change — data in old `qlj-fe-i18n_pgdata` and `qlj-fe-i18n_uploads` implicit volumes is NOT automatically migrated

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**Data migration note (acknowledged via checkpoint):** If Docker volumes named `qlj-fe-i18n_pgdata` or `qlj-fe-i18n_uploads` exist with data, they are now orphaned. New empty `transweave-pgdata` and `transweave-uploads` volumes will be created on next `docker compose up`. Manual data migration is required for any existing data.

## Next Phase Readiness

- docker-compose.yml volumes are now explicitly Transweave-branded
- Ready for remaining rename tasks in phase 11 (Plans 05+)

---
*Phase: 11-project-rename*
*Completed: 2026-03-02*
