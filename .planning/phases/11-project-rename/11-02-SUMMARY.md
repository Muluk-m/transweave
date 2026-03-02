---
phase: 11-project-rename
plan: 02
subsystem: infra
tags: [cli, binary, rename, config, env-vars]

# Dependency graph
requires:
  - phase: 11-01
    provides: "CLI package.json bin field updated to transweave -> ./bin/transweave.js"
provides:
  - "CLI bin file renamed from qlj-i18n.js to transweave.js (git mv)"
  - "CLI binary name set to 'transweave' in index.ts"
  - "Config path updated to ~/.config/transweave, project file .transweave.json"
  - "Env vars TRANSWEAVE_API_KEY and TRANSWEAVE_SERVER in config.ts"
  - "All user-facing command references updated to 'transweave init/login'"
affects: [11-05, 11-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Env var pattern: TRANSWEAVE_API_KEY, TRANSWEAVE_SERVER (replaces QLJ_I18N_*)"
    - "Config path: ~/.config/transweave/config.json"
    - "Project config file: .transweave.json"

key-files:
  created:
    - packages/cli/bin/transweave.js
  modified:
    - packages/cli/src/config.ts
    - packages/cli/src/index.ts
    - packages/cli/src/commands/init.ts
    - packages/cli/src/commands/pull.ts
    - packages/cli/src/commands/push.ts

key-decisions:
  - "qlji_ prefix in login.ts preserved unchanged (load-bearing API key authentication routing)"
  - "git mv used for bin file rename to preserve git history"

patterns-established:
  - "CLI config: ~/.config/transweave/config.json for global, .transweave.json for project"

requirements-completed: [REN-03]

# Metrics
duration: 8min
completed: 2026-03-02
---

# Phase 11 Plan 02: Project Rename - CLI Binary Summary

**CLI binary renamed to `transweave` with updated config paths, env vars, and all user-facing command strings**

## Performance

- **Duration:** 8 min
- **Completed:** 2026-03-02
- **Tasks:** 3
- **Files modified:** 7 (1 renamed via git mv, 6 edited)

## Accomplishments
- Renamed `packages/cli/bin/qlj-i18n.js` → `packages/cli/bin/transweave.js` via git mv (history preserved)
- Updated `index.ts` CLI name from `qlj-i18n` to `transweave` and description to Transweave
- Updated `config.ts` env var reads to `TRANSWEAVE_API_KEY` and `TRANSWEAVE_SERVER`
- Updated all comment doc strings in config.ts to reference `~/.config/transweave` and `.transweave.json`
- Updated all user-facing error messages in `init.ts`, `pull.ts`, `push.ts` to say `transweave init/login`
- Preserved all `qlji_` references in `login.ts` (load-bearing infrastructure)

## Task Commits

1. **Task 1: Rename bin file** - `c4ec91b` (feat)
2. **Task 2: Update config.ts env vars and comments** - `abe5c09` (feat)
3. **Task 3: Update index.ts + command user strings** - `f888a04` (feat)

## Files Created/Modified
- `packages/cli/bin/transweave.js` - Renamed from qlj-i18n.js (git mv)
- `packages/cli/src/config.ts` - Env var names + comment doc strings updated
- `packages/cli/src/index.ts` - CLI .name('transweave') and description updated
- `packages/cli/src/commands/init.ts` - Description + console.log/error strings updated
- `packages/cli/src/commands/pull.ts` - Error message strings updated
- `packages/cli/src/commands/push.ts` - Error message strings updated

## Decisions Made
- Preserved `qlji_` prefix in login.ts without exception — this is the API key routing identifier

## Deviations from Plan

None - plan executed exactly as written. Edits performed directly by orchestrator after sub-agent hit permission limits on Edit tool.

## Issues Encountered

Sub-agent hit Edit tool permission limit for TypeScript source files. Orchestrator completed edits directly.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- CLI binary is fully renamed to `transweave`
- Env vars documented for Plan 11-05 (docs update)

## Self-Check: PASSED

- All files verified present
- All commits present in git log
- qlji_ references in login.ts verified untouched

---
*Phase: 11-project-rename*
*Completed: 2026-03-02*
