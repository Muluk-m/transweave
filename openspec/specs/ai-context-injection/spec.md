## ADDED Requirements

### Requirement: Glossary injection into AI translation prompt
When AI translation is invoked, the system SHALL resolve the project's glossary and inject matching terms into the translation prompt. Only terms whose sourceTerm appears in the text being translated SHALL be included.

#### Scenario: Matching glossary terms injected
- **WHEN** translating "Save the token to the module" and glossary contains "token"→{zh:"词条"} and "module"→{zh:"模块"}
- **THEN** the prompt SHALL include a glossary section listing these terms with their target-language translations

#### Scenario: Do-not-translate term injected
- **WHEN** glossary has "API" with doNotTranslate=true
- **AND** the text contains "API"
- **THEN** the prompt SHALL instruct the AI to keep "API" untranslated

#### Scenario: No matching terms
- **WHEN** no glossary terms match the source text
- **THEN** the prompt SHALL NOT include a glossary section

### Requirement: TM context injection into AI translation prompt
When AI translation is invoked, the system SHALL query TM for the source text and inject top 3 matches with >= 80% similarity as reference translations in the prompt.

#### Scenario: TM matches injected
- **WHEN** translating "Save all changes" and TM has "Save changes"→"保存更改" (85% similarity)
- **THEN** the prompt SHALL include a "Similar translations for reference" section with this match

#### Scenario: No TM matches above threshold
- **WHEN** no TM entries have >= 80% similarity
- **THEN** the prompt SHALL NOT include a TM reference section

### Requirement: Enhanced prompt structure
The `buildTranslationPrompt` function SHALL accept optional `glossaryTerms` and `tmMatches` parameters and append them as structured sections before the output format block.

#### Scenario: Full prompt with glossary and TM
- **WHEN** both glossary terms and TM matches are available
- **THEN** the prompt SHALL include: original instruction → glossary section → TM section → output format
- **AND** the glossary section SHALL use the header "Glossary (use these exact translations for the following terms):"
- **AND** the TM section SHALL use the header "Similar translations for reference:"
