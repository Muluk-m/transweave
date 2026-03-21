## Why

Transweave has no mechanism for translation consistency across keys or projects. Translators re-translate the same phrases differently, and AI translation produces inconsistent terminology because it lacks domain context. Every major competitor (Crowdin, Lokalise, Phrase, Tolgee) ships glossary and translation memory as core features. Adding these unlocks two high-value outcomes: consistent human translations via TM suggestions, and dramatically better AI translations by injecting glossary terms and TM matches into the prompt.

## What Changes

- **Glossary management** — CRUD for terminology entries scoped to team or project level. Each entry has a source term, translations per language, an optional description, and a "do not translate" flag. Glossary terms are highlighted in the translation editor and injected into AI translation prompts.
- **Translation Memory** — Automatically built from saved translations. On token create/update, source-target pairs are written to a TM store. When editing a translation, the system suggests TM matches ranked by similarity. TM entries are scoped per project with optional cross-project sharing within a team.
- **AI prompt enhancement** — `buildTranslationPrompt()` is extended to accept glossary terms and TM matches as additional context, producing more consistent AI output.
- **Glossary API** — New REST endpoints for glossary CRUD, TM query, and bulk import/export of glossary entries.
- **Web UI** — Glossary management page per project/team, TM suggestions panel in token editor, glossary term highlighting in translation fields.

## Capabilities

### New Capabilities

- `glossary`: Team/project-scoped terminology management — CRUD, import/export, term highlighting, AI prompt injection.
- `translation-memory`: Automatic TM population on translation save, fuzzy matching suggestions, cross-project sharing within team.
- `ai-context-injection`: Enhanced AI translation prompts with glossary terms and TM matches for consistent output.

### Modified Capabilities

_(none — no existing specs are affected)_

## Impact

- **Database**: Two new tables (`glossary_entries`, `translation_memory`) + migration 0007.
- **Server**: New `GlossaryService`, `TranslationMemoryService`, `GlossaryController`. Modified `AiService.translate()` and `buildTranslationPrompt()`. Modified `TokenService.create()` and `TokenService.update()` to write TM entries.
- **Web**: New glossary management page, TM suggestions component in token editor, glossary term highlight overlay.
- **Dependencies**: None new on server. May add a lightweight string similarity library (or implement Levenshtein in-house).
- **APIs**: ~8 new endpoints under `/api/glossary` and `/api/tm`. No breaking changes to existing endpoints.
