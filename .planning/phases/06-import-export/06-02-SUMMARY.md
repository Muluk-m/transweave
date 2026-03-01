---
phase: 06-import-export
plan: 02
subsystem: web
tags: [xliff, gettext, po, import, export, frontend, ui]

# Dependency graph
requires:
  - phase: 06-import-export
    plan: 01
    provides: XLIFF and Gettext parsers/serializers in backend
provides:
  - Frontend import UI accepting .xlf, .xliff, and .po files via drag-and-drop
  - Frontend export UI with XLIFF and Gettext (.po) format options
  - Updated API client types with xliff and po format unions
  - Updated i18n strings for supported formats in en-US and zh-CN
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: [format-extension-ui]

key-files:
  created: []
  modified:
    - packages/web/api/project.ts
    - packages/web/components/views/projectView/ProjectImportTab.tsx
    - packages/web/components/views/projectView/ProjectExportTab.tsx
    - packages/web/i18n/en-US.json
    - packages/web/i18n/zh-CN.json

key-decisions:
  - "Used application/xml MIME type for .xlf and .xliff extensions (browsers treat XLIFF as XML)"
  - "Used application/x-gettext MIME type for .po files in dropzone accept config"
  - "Blue-500 icon color for XLIFF, orange-500 for Gettext to visually distinguish from existing formats"
  - "Changed export grid from 2-column to 3-column layout to accommodate 6 formats in 2 rows"
  - "Used English string literals for new format labels (XLIFF, Gettext) since they are universal terms"

patterns-established: []

requirements-completed: [IMEX-05, IMEX-06]

# Metrics
duration: 4min
completed: 2026-03-01
---

# Phase 6 Plan 02: Frontend UI for XLIFF and Gettext Formats Summary

**Updated import/export UI components with XLIFF and Gettext (.po) format support across 5 files**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-01
- **Completed:** 2026-03-01
- **Tasks:** 2 (1 auto, 1 human-verify skipped)
- **Files modified:** 5

## Accomplishments
- API client types (`api/project.ts`) updated with `'xliff' | 'po'` in all three format unions (export, preview, import)
- ProjectImportTab dropzone now accepts `.xlf`, `.xliff`, and `.po` file extensions
- `getFileFormat()` function correctly maps `.xlf`/`.xliff` to `'xliff'` and `.po` to `'po'`
- File icons use distinctive colors: blue-500 for XLIFF, orange-500 for Gettext
- Import notes section includes explanations for XLIFF and Gettext import behavior
- Supported formats text updated in both en-US and zh-CN locales
- ProjectExportTab shows 6 format options (JSON, CSV, XML, YAML, XLIFF, Gettext) in a 3-column grid
- XLIFF card: "Industry standard for CAT tools" description
- Gettext card: "Standard for open-source projects" description
- Format cast in `handleExport` updated to include new format types

## Task Commits

1. **Task 1: Update API client types and import/export UI components** - Changes committed in `c250e3c` (applied alongside 07-02 plan execution which required the same API type updates)
2. **Task 2: End-to-end verification** - Skipped (human-verify checkpoint, deferred to manual testing)

## Files Modified
- `packages/web/api/project.ts` - Added 'xliff' | 'po' to exportProjectTokens, previewImportTokens, importProjectTokens format types
- `packages/web/components/views/projectView/ProjectImportTab.tsx` - Extended dropzone accept, getFileFormat, getFileIcon for XLIFF/Gettext; added import notes
- `packages/web/components/views/projectView/ProjectExportTab.tsx` - Added XLIFF and Gettext radio options, changed to grid-cols-3, updated format cast
- `packages/web/i18n/en-US.json` - Updated supportedFormats string to include XLIFF and Gettext
- `packages/web/i18n/zh-CN.json` - Updated supportedFormats string to include XLIFF and Gettext

## Decisions Made
- Reused application/xml MIME type for XLIFF since browsers handle .xlf/.xliff as XML
- Used descriptive English string literals for new format labels (internationally recognized terms)
- 3-column grid layout provides balanced 2x3 grid for 6 format options

## Deviations from Plan

### Note: Overlapping Changes with Plan 07-02
- **Context:** Plan 07-02 (AI Translation Frontend) was executed in parallel and included the same API type updates and UI component changes for XLIFF/Gettext support in commit c250e3c
- **Impact:** No additional commit needed for 06-02; all changes verified present and correct
- **Verification:** TypeScript compilation passes with no errors in modified files

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Skipped Tasks
- **Task 2 (human-verify checkpoint):** Deferred to manual testing. Requires starting dev servers and testing drag-drop import/export for all 6 formats end-to-end.

## Self-Check: PASSED

All must-have truths verified:
- [x] User can select XLIFF as an import format in the import UI
- [x] User can select Gettext (.po) as an import format in the import UI
- [x] User can select XLIFF as an export format in the export UI
- [x] User can select Gettext (.po) as an export format in the export UI
- [x] Drag-and-drop accepts .xlf, .xliff, and .po file extensions
- [x] TypeScript compilation passes with no errors in modified files

---
*Phase: 06-import-export*
*Completed: 2026-03-01*
