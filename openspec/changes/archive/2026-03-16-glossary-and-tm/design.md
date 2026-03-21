## Context

Transweave stores translations as `Record<string, string>` in a JSONB `translations` column on the `tokens` table. The AI service uses `buildTranslationPrompt(text, from, to[])` to generate a prompt that includes no domain context. The token service has clear entry points at `create()` and `update()` where TM writes can be injected. Projects have a `defaultLang` field that serves as the source language. The latest migration is 0006.

## Goals / Non-Goals

**Goals:**

- Glossary with team and project scoping, supporting CRUD, bulk import/export, and AI prompt injection.
- Translation Memory automatically populated from translation saves, with fuzzy matching suggestions.
- AI translation prompts enhanced with glossary terms and top TM matches.
- Web UI for glossary management and TM suggestions in the translation editor.

**Non-Goals:**

- Machine-learning-based TM (e.g., embedding similarity) — use Levenshtein distance for now.
- Cross-team TM sharing — only within a team's projects.
- TM deduplication or cleanup tools.
- Glossary enforcement (blocking saves on violations) — advisory only.

## Decisions

### 1. Database schema: two new tables

**Decision**: Create `glossary_entries` and `translation_memory` tables.

```
glossary_entries:
  id          uuid PK
  teamId      uuid FK → teams (nullable, for team-level glossary)
  projectId   uuid FK → projects (nullable, for project-level glossary)
  sourceTerm  text NOT NULL
  translations jsonb NOT NULL  -- Record<string, string>
  description text
  caseSensitive boolean DEFAULT false
  doNotTranslate boolean DEFAULT false
  createdBy   uuid FK → users
  createdAt   timestamp
  updatedAt   timestamp

  UNIQUE(teamId, projectId, sourceTerm)  -- one entry per term per scope
  INDEX(teamId), INDEX(projectId)

translation_memory:
  id          uuid PK
  projectId   uuid FK → projects ON DELETE CASCADE
  sourceLanguage text NOT NULL
  targetLanguage text NOT NULL
  sourceText  text NOT NULL
  targetText  text NOT NULL
  tokenId     uuid FK → tokens (nullable, ON DELETE SET NULL)
  createdBy   uuid FK → users (nullable)
  createdAt   timestamp
  updatedAt   timestamp

  UNIQUE(projectId, sourceLanguage, targetLanguage, sourceText)
  INDEX(projectId, sourceLanguage, targetLanguage)
```

**Alternatives considered**:
- Storing TM in the existing `token_history` table — rejected because TM needs per-segment storage (one source→one target per language), while token history stores full snapshots.
- Using pg_trgm for fuzzy matching — good idea but adds PostgreSQL extension dependency, won't work with PGlite. Use application-level Levenshtein instead.

### 2. TM scoping: project-first with team-level fallback

**Decision**: TM entries belong to a project. When querying suggestions, first search the current project's TM, then optionally search other projects in the same team (controlled by a project setting `enableCrossProjectTM`, default true).

**Alternatives considered**:
- Team-level TM only — loses project-specific terminology nuance.
- Global TM — too noisy across unrelated projects.

### 3. TM write strategy: on translation save, extract per-language pairs

**Decision**: When a token is created or updated with translations, extract each `{sourceLanguage → targetLanguage: sourceText → targetText}` pair and upsert into TM. Source language is `project.defaultLang`. Only write non-empty translations.

```
Token save:  key="common.save", translations={en:"Save", zh:"保存", ja:"保存する"}
Project defaultLang: "en"

TM writes:
  (en → zh) "Save" → "保存"
  (en → ja) "Save" → "保存する"
```

**Alternatives considered**:
- Async TM population via queue — adds complexity; synchronous upsert is fast enough for single-token saves.
- Only write on explicit "approve" — no approval workflow exists yet; write on every save.

### 4. TM matching: Levenshtein distance with threshold

**Decision**: When a user edits a translation, query TM for the source text. Use Levenshtein distance to rank matches. Return top 5 matches with similarity >= 60%. Exact matches first, then fuzzy.

Implementation: compute Levenshtein in JavaScript (not SQL), since we need PGlite compatibility. Query TM entries by `projectId + sourceLanguage + targetLanguage`, load candidates (limit 200 by prefix/substring pre-filter in SQL), then rank client-side.

**Alternatives considered**:
- SQL-level `similarity()` via pg_trgm — PGlite doesn't support extensions.
- Full-text search with `tsvector` — overkill for short translation segments.

### 5. AI prompt injection: append glossary and TM to existing prompt

**Decision**: Extend `buildTranslationPrompt()` to accept optional `glossaryTerms` and `tmMatches` parameters. Append them as structured sections before the output format instructions:

```
...existing prompt...

Glossary (use these exact translations for the following terms):
- "Token" → zh: "词条", ja: "トークン"
- "Module" → zh: "模块", ja: "モジュール"

Similar translations for reference:
- "Save changes" → zh: "保存更改", ja: "変更を保存"

Output format:
...
```

The glossary section is always included if terms exist. TM section includes top 3 matches with similarity >= 80%.

**Alternatives considered**:
- System message vs user message injection — keep it in the user message for provider compatibility (DeepL and Google Translate don't support system messages).

### 6. Glossary import/export: JSON and CSV

**Decision**: Support bulk import/export in JSON (`[{sourceTerm, translations, description}]`) and CSV (`sourceTerm,en,zh,ja,...`). Reuse the existing ZIP download pattern for export.

## Risks / Trade-offs

- **[Risk] Large TM tables on big projects** → Pre-filter with SQL `LIKE` before loading into JS for Levenshtein. Add index on `(projectId, sourceLanguage, targetLanguage)`. Consider pagination if needed later.
- **[Risk] TM write latency on bulk imports** → Batch upsert with `ON CONFLICT DO UPDATE`. For imports of 1000+ tokens, process TM writes in chunks of 100.
- **[Trade-off] Application-level fuzzy matching is slower than pg_trgm** → Acceptable for now; segment texts are short (typically < 200 chars). If performance becomes an issue, can add pg_trgm as optional PostgreSQL-only optimization.
- **[Trade-off] No glossary enforcement** → Keeps UX simple; enforcement can be added later as a QA check.
