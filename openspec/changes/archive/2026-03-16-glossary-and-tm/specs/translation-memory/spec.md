## ADDED Requirements

### Requirement: Automatic TM population on translation save
When a token is created or updated with translations, the system SHALL extract source→target language pairs (using project.defaultLang as source) and upsert them into the translation memory. Empty translations SHALL NOT be written.

#### Scenario: Token create populates TM
- **WHEN** a token is created with translations `{en: "Save", zh: "保存"}` and project defaultLang is "en"
- **THEN** TM entry `(en→zh, "Save"→"保存")` SHALL be upserted

#### Scenario: Token update upserts TM
- **WHEN** a token's zh translation is changed from "保存" to "储存"
- **THEN** TM entry `(en→zh, "Save"→"储存")` SHALL be upserted (overwriting the previous target)

#### Scenario: Empty translation skipped
- **WHEN** a token is saved with `{en: "Save", zh: ""}`
- **THEN** no TM entry SHALL be created for the en→zh pair

### Requirement: TM suggestion query
The system SHALL provide an API endpoint to query TM suggestions for a given source text, source language, and target language. Results SHALL be ranked by similarity (exact matches first, then fuzzy by Levenshtein distance). Only matches with >= 60% similarity SHALL be returned, limited to 5 results.

#### Scenario: Exact TM match
- **WHEN** TM contains `(en→zh, "Save"→"保存")` and user queries for source="Save", en→zh
- **THEN** the system SHALL return `[{sourceText: "Save", targetText: "保存", similarity: 100}]`

#### Scenario: Fuzzy TM match
- **WHEN** TM contains `(en→zh, "Save changes"→"保存更改")` and user queries for source="Save all changes", en→zh
- **THEN** the system SHALL return the match with a similarity percentage reflecting the Levenshtein distance

#### Scenario: Below threshold
- **WHEN** TM only contains very different strings (< 60% similarity)
- **THEN** the system SHALL return an empty array

### Requirement: Cross-project TM search
When querying TM, the system SHALL first search the current project, then optionally search other projects in the same team. Cross-project search SHALL be controlled by a project setting `enableCrossProjectTM` (default true).

#### Scenario: Cross-project enabled
- **WHEN** project A has no TM match but project B (same team) has a match
- **AND** project A has enableCrossProjectTM=true
- **THEN** the match from project B SHALL be returned with a `crossProject: true` flag

#### Scenario: Cross-project disabled
- **WHEN** project A has enableCrossProjectTM=false
- **THEN** only project A's TM entries SHALL be searched

### Requirement: TM suggestions in translation editor
The web UI token editor SHALL display TM suggestions when a user focuses on a translation field. Suggestions SHALL show source text, target text, similarity percentage, and source project (if cross-project).

#### Scenario: Display suggestions
- **WHEN** a user clicks on a translation input field for language "zh"
- **THEN** the system SHALL query TM for the token's source text (defaultLang value) targeting "zh"
- **AND** display matching suggestions below the input field

#### Scenario: Apply suggestion
- **WHEN** a user clicks a TM suggestion
- **THEN** the suggestion's target text SHALL be filled into the translation input field

### Requirement: TM population from bulk import
When translations are imported via `POST /api/project/import/:projectId`, the system SHALL populate TM entries for all imported translation pairs.

#### Scenario: Import writes TM
- **WHEN** 100 tokens are imported with translations
- **THEN** TM entries SHALL be created/updated for all non-empty source→target pairs
- **AND** TM writes SHALL be batched (chunks of 100) to avoid performance issues
