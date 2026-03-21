## 1. Database Schema & Migration

- [x] 1.1 Create Drizzle schema for `glossary_entries` table (`src/db/schema/glossary.ts`): id, teamId, projectId, sourceTerm, translations (jsonb), description, caseSensitive, doNotTranslate, createdBy, timestamps. Add unique constraint on (teamId, projectId, sourceTerm) and indexes.
- [x] 1.2 Create Drizzle schema for `translation_memory` table (`src/db/schema/translation-memory.ts`): id, projectId, sourceLanguage, targetLanguage, sourceText, targetText, tokenId, createdBy, timestamps. Add unique constraint on (projectId, sourceLanguage, targetLanguage, sourceText) and indexes.
- [x] 1.3 Add `enableCrossProjectTM` boolean field to projects schema (default true)
- [x] 1.4 Update `src/db/schema/relations.ts` with new table relations
- [x] 1.5 Generate and apply migration 0007 via drizzle-kit

## 2. Glossary Backend

- [x] 2.1 Create `src/repository/glossary.repository.ts` with CRUD methods, search by scope (teamId/projectId), and bulk upsert
- [x] 2.2 Create `src/service/glossary.service.ts` with: create, update, delete, list (with search/pagination), resolveForProject (merge team+project with project precedence), bulk import/export
- [x] 2.3 Create `src/controller/glossary.controller.ts` with endpoints: POST /api/glossary, GET /api/glossary, PUT /api/glossary/:id, DELETE /api/glossary/:id, GET /api/glossary/export, POST /api/glossary/import, GET /api/glossary/resolve/:projectId
- [x] 2.4 Create DTOs for glossary operations (CreateGlossaryDto, UpdateGlossaryDto, ImportGlossaryDto)
- [x] 2.5 Register GlossaryController and GlossaryService in AppModule

## 3. Translation Memory Backend

- [x] 3.1 Create `src/utils/levenshtein.ts` — Levenshtein distance function + similarity percentage calculation
- [x] 3.2 Create `src/repository/translation-memory.repository.ts` with: upsert, batchUpsert, findBySourceText (pre-filtered by project+languages), findCrossProject (by teamId)
- [x] 3.3 Create `src/service/translation-memory.service.ts` with: recordTranslation (single pair upsert), recordTokenTranslations (extract pairs from token save), querySuggestions (load candidates → Levenshtein rank → top 5 >= 60%)
- [x] 3.4 Create `src/controller/translation-memory.controller.ts` with: GET /api/tm/suggestions?projectId&sourceText&sourceLang&targetLang (returns ranked matches)
- [x] 3.5 Register TM controller and service in AppModule

## 4. Integration: TM Auto-Population

- [x] 4.1 Modify `TokenService.create()` to call `TranslationMemoryService.recordTokenTranslations()` after token creation
- [x] 4.2 Modify `TokenService.update()` to call `TranslationMemoryService.recordTokenTranslations()` after translation update
- [x] 4.3 Modify `ProjectService.importProjectTokens()` to batch-populate TM after import (chunks of 100)

## 5. Integration: AI Prompt Enhancement

- [x] 5.1 Extend `buildTranslationPrompt()` in `src/ai/providers/prompt.ts` to accept optional `glossaryTerms` and `tmMatches` parameters, append structured sections
- [x] 5.2 Modify `AiService.translate()` to resolve glossary terms (filter by matching source text) and query top 3 TM matches (>= 80% similarity) before calling the provider
- [x] 5.3 Pass glossary and TM context through to the prompt builder

## 6. Web Frontend — Glossary Page

- [x] 6.1 Create glossary API client (`api/glossary.ts`) with methods for CRUD, import, export, resolve
- [x] 6.2 Create glossary management page at `/project/[projectId]/glossary` with searchable table, add/edit/delete dialogs
- [x] 6.3 Add glossary page link to project navigation/tabs
- [x] 6.4 Create glossary import/export UI (upload CSV/JSON, download)
- [x] 6.5 Add i18n keys for glossary-related UI text (zh-CN and en-US)

## 7. Web Frontend — TM Suggestions & Term Highlighting

- [x] 7.1 Create TM API client (`api/translation-memory.ts`) with suggestion query method
- [x] 7.2 Create TM suggestions component: on translation field focus, query suggestions and display as a dropdown list with source, target, similarity%, and "apply" button
- [x] 7.3 Integrate TM suggestions component into the token editor view
- [x] 7.4 Create glossary term highlight component: match resolved glossary terms in source text, render with tooltip showing target translation
- [x] 7.5 Integrate glossary highlights into the token editor source text display
- [x] 7.6 Add i18n keys for TM and highlight UI text (zh-CN and en-US)
