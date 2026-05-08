## ADDED Requirements

### Requirement: Glossary entry can opt into cross-language auto-sync
A glossary entry SHALL have an `autoSyncToAllLanguages` boolean field (default `false`). When `true`, creating the entry SHALL automatically backfill empty-string translations for every language configured in the entry's scope (project or team).

#### Scenario: Create with sync enabled
- **WHEN** a project has languages `[en-US, zh-CN, ja-JP, fr-FR]`
- **AND** a user creates a glossary entry for sourceTerm="API" with `autoSyncToAllLanguages=true` and `translations={"zh-CN": "接口"}`
- **THEN** the persisted entry SHALL have `translations = { "en-US": "", "zh-CN": "接口", "ja-JP": "", "fr-FR": "" }`

#### Scenario: Create with sync disabled
- **WHEN** the same call has `autoSyncToAllLanguages=false`
- **THEN** the persisted entry SHALL have `translations = { "zh-CN": "接口" }` only

### Requirement: New language triggers backfill
When a project or team adds a new language, the system SHALL backfill empty-string translations for all `autoSyncToAllLanguages=true` glossary entries in that scope. Existing translations SHALL never be overwritten.

#### Scenario: Add language to project
- **WHEN** a project has 5 glossary entries with `autoSyncToAllLanguages=true` and the user adds language `de-DE`
- **THEN** all 5 entries SHALL have `translations["de-DE"] = ""` added

#### Scenario: Existing translation preserved
- **WHEN** a glossary entry already has a non-empty translation for a language
- **THEN** any backfill operation SHALL leave it untouched

### Requirement: Empty glossary translation surfaces in AI prompt
When the AI prompt context is built and a matched glossary term has an empty translation for the current target language, the prompt SHALL render that term as `[MISSING — pick consistent with related terms]` rather than omitting it. This signals to the model that consistency is required even where no translation is yet defined.

#### Scenario: Missing translation hint in prompt
- **WHEN** glossary has entry "Token" with `translations = { "zh-CN": "词条", "ja-JP": "" }`
- **AND** AI is translating into `ja-JP` and source contains "Token"
- **THEN** the prompt SHALL include `Token → [MISSING — pick consistent with related terms]` (or similar) rather than omitting the term
