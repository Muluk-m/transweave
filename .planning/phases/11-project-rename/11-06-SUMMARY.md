---
phase: 11-project-rename
plan: "06"
subsystem: infra
tags: [verification, rename, grep, breaking-change]

# Dependency graph
requires:
  - phase: 11-project-rename/11-05
    provides: Documentation rebranded to Transweave
provides:
  - Final verification that no old-brand references remain
  - Recorded BREAKING CHANGE that further cleaned originally-preserved load-bearing identifiers
affects: [phase-12, phase-13]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified: []

key-decisions:
  - "Originally load-bearing qlji_ API key prefix renamed to tw_ in commit b314580 (BREAKING CHANGE) — overrides the 11-RESEARCH 'must preserve' constraint because Transweave is not yet publicly released and a clean prefix is preferable long-term"
  - "Originally load-bearing qlj-i18n-ai-salt encryption salt renamed to transweave-ai-salt in same commit (BREAKING CHANGE) — existing encrypted AI provider API keys must be re-entered; acceptable since no production users"
  - "KEY_PREFIX_LENGTH reduced from 13 to 11 to match new tw_ prefix length"
  - "Human checkpoint approved 2026-05-13 after grep verification confirmed the cleaner final state"

patterns-established: []

requirements-completed: [REN-08, REN-09]

# Metrics
duration: 5min
completed: 2026-05-13
---

# Phase 11 Plan 06: Final Rename Verification Summary

**Grep verification passed with zero old-brand references; user approved the more thorough cleanup that also retired the originally-preserved qlji_ and qlj-i18n-ai-salt identifiers**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-13T15:46+08:00
- **Completed:** 2026-05-13T15:48+08:00
- **Tasks:** 2 (1 auto, 1 human checkpoint)
- **Files modified:** 0

## Accomplishments

- Ran the two-step grep verification across the codebase
- Confirmed zero remaining matches for `qlj-i18n`, `@qlj/`, `QLJ_I18N`, `"nextjs"`
- Discovered that commit `b314580` had additionally retired the originally-preserved identifiers (`qlji_` → `tw_`, `qlj-i18n-ai-salt` → `transweave-ai-salt`)
- Verified the rename was a deliberate BREAKING CHANGE with explicit commit message, not an accidental over-rename
- Confirmed `packages/cli/bin/transweave.js` exists
- Human checkpoint received "approved" from user 2026-05-13 — Phase 11 closed

## Verification Results

**Command 1 (zero-match expected):**

```bash
grep -rn "qlj-i18n\|@qlj/\|QLJ_I18N\|\"nextjs\"" ... .
→ 0 matches
```

**Command 2 (was "must preserve" — now intentionally renamed):**

```bash
grep -rn "qlji_\|qlj-i18n-ai-salt" --include="*.ts" .
→ 0 matches
```

This second result diverged from the 11-06 PLAN's expectation. Investigation showed commit `b314580` ("refactor: rename API key prefix from qlji_ to tw_ and fix encryption salt") was a deliberate BREAKING CHANGE made after the original Phase 11 RESEARCH was authored. Final identifiers:

- `tw_` — API key prefix (`packages/server/src/service/api-key.service.ts:22`, `guard.ts:37`)
- `transweave-ai-salt` — encryption salt (`packages/server/src/ai/encryption.util.ts:17`)

## Task Commits

1. **Task 1: Run rename completeness verification grep** — no commit (read-only verification)
2. **Task 2: Final review and approval checkpoint** — user approved 2026-05-13

## Files Created/Modified

None. This plan is verification-only.

## Decisions Made

- Accept the cleaner final state from commit `b314580` rather than reverting to the originally-preserved identifiers. The decision rationale: Transweave is pre-public-release; a brand-consistent prefix and salt are strictly better than retaining legacy `qlji_` infrastructure values
- Phase 11 is closed at a state more thorough than originally planned

## Deviations from Plan

11-06 PLAN required `qlji_` and `qlj-i18n-ai-salt` to remain present after rename. Commit `b314580` made a contradicting BREAKING CHANGE between 11-RESEARCH and this verification step. The PLAN's invariant is now obsolete; user approved the final state regardless.

## Issues Encountered

The "preserved-identifiers must remain" invariant from 11-06 PLAN was already invalidated by a subsequent BREAKING CHANGE commit. Resolved by recognizing the commit as a deliberate refactor and securing human approval of the cleaner state.

## User Setup Required

Anyone with existing data must:

1. Regenerate all API keys (old `qlji_` keys no longer validate)
2. Re-enter AI provider API keys (encryption salt change invalidates stored ciphertexts)

For pre-release self-hosted deployments this is a one-time cost.

## Next Phase Readiness

- All old-brand references purged from source
- Phase 12 (Landing Page) can proceed

---
*Phase: 11-project-rename*
*Completed: 2026-05-13*
