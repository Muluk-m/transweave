---
phase: 06-import-export
plan: 01
subsystem: api
tags: [xliff, gettext, po, import, export, i18n, localization, tdd]

# Dependency graph
requires:
  - phase: 05-translation-core-search
    provides: Token CRUD, import/export pipeline (importFrom.ts, exportTo.ts)
provides:
  - XLIFF 1.2 parser and serializer using xliff npm package
  - Gettext .po parser and serializer using gettext-parser npm package
  - Format registry with unified exports and supported format constants
  - Extended import/export pipeline accepting xliff and po formats
  - ZIP export with .xlf and .po files per language
affects: [06-import-export, 07-ai-translation, 08-developer-tools]

# Tech tracking
tech-stack:
  added: [xliff@6.3.0, gettext-parser@4.2.0]
  patterns: [format-handler-module, async-parse-import, format-registry-pattern]

key-files:
  created:
    - packages/server/src/utils/formats/types.ts
    - packages/server/src/utils/formats/xliff.parser.ts
    - packages/server/src/utils/formats/xliff.serializer.ts
    - packages/server/src/utils/formats/gettext.parser.ts
    - packages/server/src/utils/formats/gettext.serializer.ts
    - packages/server/src/utils/formats/index.ts
    - packages/server/src/utils/formats/xliff.spec.ts
    - packages/server/src/utils/formats/gettext.spec.ts
  modified:
    - packages/server/src/utils/importFrom.ts
    - packages/server/src/utils/exportTo.ts
    - packages/server/src/service/project.service.ts
    - packages/server/src/controller/project.controller.ts
    - packages/server/package.json

key-decisions:
  - "Used gettext-parser v4 instead of v8/v9 because newer versions are ESM-only, incompatible with Jest/ts-jest CJS transform"
  - "Made parseImportData async to support xliff package async API (xliff12ToJs returns Promise)"
  - "XLIFF ZIP export produces per-language .xlf files but no merged 'all' file since XLIFF is inherently one source+one target per file"
  - "PO ZIP export produces per-language .po files but no merged 'all' file since .po is single-language by design"
  - "Used SupportedImportFormat/SupportedExportFormat union types across service and controller layers for type safety"

patterns-established:
  - "Format handler module pattern: separate parser.ts and serializer.ts per format in packages/server/src/utils/formats/"
  - "Format registry: centralized index.ts re-exporting all format handlers with SUPPORTED_*_FORMATS constants"

requirements-completed: [IMEX-01, IMEX-02, IMEX-03, IMEX-04, IMEX-05]

# Metrics
duration: 9min
completed: 2026-03-01
---

# Phase 6 Plan 01: XLIFF and Gettext Parsers/Serializers Summary

**XLIFF 1.2 and Gettext .po parsers/serializers with TDD (26 tests), integrated into import/export pipeline via format registry**

## Performance

- **Duration:** 9 min
- **Started:** 2026-03-01T13:29:51Z
- **Completed:** 2026-03-01T13:39:20Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Full XLIFF 1.2 parsing (single and multi-language) and serialization using `xliff` npm package
- Full Gettext .po parsing (single/multi-language, msgctxt, plurals, multiline) and serialization using `gettext-parser`
- 26 passing tests covering parsing, serialization, round-trip, edge cases, and error handling
- Format registry providing unified interface and supported format constants
- Seamless integration into existing import/export pipeline -- importFrom.ts and exportTo.ts accept 'xliff' and 'po' alongside existing formats
- ZIP export generates per-language .xlf or .po files

## Task Commits

Each task was committed atomically:

1. **Task 1: Install format libraries and create XLIFF + Gettext parsers with tests** - `c6279fd` (feat)
2. **Task 2: Create format registry and integrate new formats into import/export pipeline** - `d6b8bbc` (feat)

**Plan metadata:** [pending] (docs: complete plan)

_Note: Task 1 files were committed alongside other work in c6279fd due to git state; all format files verified present and correct._

## Files Created/Modified
- `packages/server/src/utils/formats/types.ts` - Shared types (TokenData, SerializeOptions, SupportedImportFormat, SupportedExportFormat)
- `packages/server/src/utils/formats/xliff.parser.ts` - XLIFF 1.2 parser (parseXliff, parseXliffMultiLanguage)
- `packages/server/src/utils/formats/xliff.serializer.ts` - XLIFF 1.2 serializer (serializeXliff, createSingleLanguageXliff)
- `packages/server/src/utils/formats/gettext.parser.ts` - Gettext .po parser (parsePo, parsePoMultiLanguage)
- `packages/server/src/utils/formats/gettext.serializer.ts` - Gettext .po serializer (serializePo, createSingleLanguagePo)
- `packages/server/src/utils/formats/index.ts` - Format registry with re-exports and constants
- `packages/server/src/utils/formats/xliff.spec.ts` - 12 XLIFF tests (parsing, serialization, round-trip)
- `packages/server/src/utils/formats/gettext.spec.ts` - 14 Gettext tests (parsing, serialization, round-trip)
- `packages/server/src/utils/importFrom.ts` - Added xliff/po cases, made functions async
- `packages/server/src/utils/exportTo.ts` - Added xliff/po cases to ZIP generation
- `packages/server/src/service/project.service.ts` - Updated format types, await async parseImportData
- `packages/server/src/controller/project.controller.ts` - Updated format types in all endpoints
- `packages/server/package.json` - Added xliff and gettext-parser dependencies

## Decisions Made
- Used gettext-parser v4 (CJS) instead of v8/v9 (ESM-only) for Jest/ts-jest compatibility
- Made parseImportData/parseImportDataMultiLanguage async since xliff package is async-only
- XLIFF uses source language from first project language, each export file has source+target pair
- No merged "all" file for XLIFF or PO formats (both are inherently per-language-pair or per-language)
- Used SupportedImportFormat/SupportedExportFormat type aliases across all layers for consistency

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] gettext-parser ESM incompatibility**
- **Found during:** Task 1 (Gettext parser implementation)
- **Issue:** gettext-parser v9 and v8 are ESM-only modules, incompatible with Jest CJS transform via ts-jest
- **Fix:** Downgraded to gettext-parser v4.2.0 which provides CJS exports
- **Files modified:** packages/server/package.json, pnpm-lock.yaml
- **Verification:** All 26 tests pass
- **Committed in:** c6279fd (Task 1 commit)

**2. [Rule 1 - Bug] Case sensitivity in PO header test**
- **Found during:** Task 1 (Gettext serializer tests)
- **Issue:** Test expected `charset=UTF-8` but gettext-parser outputs `charset=utf-8`
- **Fix:** Changed test to use case-insensitive comparison for Content-Type header
- **Files modified:** packages/server/src/utils/formats/gettext.spec.ts
- **Verification:** Test passes correctly
- **Committed in:** c6279fd (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both auto-fixes necessary for correct operation. No scope creep.

## Issues Encountered
None beyond the deviations documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Format parsers/serializers ready for frontend integration in 06-02-PLAN
- All import/export endpoints accept 'xliff' and 'po' format parameters
- Ready for end-to-end testing with actual XLIFF and PO files

## Self-Check: PASSED

All 8 created files verified present. Both commit hashes (c6279fd, d6b8bbc) verified in git log. 26 format tests passing.

---
*Phase: 06-import-export*
*Completed: 2026-03-01*
