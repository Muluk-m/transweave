## MODIFIED Requirements

### Requirement: Glossary and TM context injected into AI prompt
The AI translation service SHALL inject glossary terms and translation memory matches into the prompt context for both single and batch translation operations. Glossary entries with `doNotTranslate=true` SHALL be rendered in a dedicated "DO NOT TRANSLATE — keep verbatim" section, distinct from regular term hints. The number of glossary terms injected SHALL be capped at 10 per request, ranked by match length descending then by usage frequency.

#### Scenario: Single translation injects both
- **WHEN** a user calls `POST /api/ai/translate` for a token whose source text contains 2 glossary terms
- **AND** TM has 3 fuzzy matches above 80% similarity for the target language
- **THEN** the rendered prompt SHALL contain both the glossary terms (up to 10) and TM matches (up to 3)

#### Scenario: Batch translation injects TM (previously missing)
- **WHEN** a batch translate of 100 tokens runs
- **THEN** the system SHALL pre-fetch TM matches per `(targetLang, sourceText)` in bulk before kicking off provider calls
- **AND** each token's prompt SHALL include its specific TM matches (not just glossary)

#### Scenario: doNotTranslate emphasis
- **WHEN** a glossary entry has `doNotTranslate=true` for the term "Transweave"
- **AND** the source text contains "Transweave"
- **THEN** the prompt SHALL contain a section: `DO NOT TRANSLATE — keep verbatim: Transweave` (or i18n equivalent if non-English provider)

#### Scenario: Glossary cap at 10
- **WHEN** a source text matches 25 glossary terms
- **THEN** the prompt SHALL include only the top 10 (longest match first, then most frequently used)

### Requirement: Translation metadata captures prompt provenance
Each successful translation SHALL persist provenance metadata into `tokens.translationMeta[lang]`: `{ promptHash, glossaryHits: string[], tmHits: number, model, providerName, templateId? }`. `promptHash` SHALL be a SHA-256 of the rendered prompt body (no plaintext stored).

#### Scenario: Provenance recorded
- **WHEN** the AI translates a token successfully
- **THEN** `translationMeta["zh-CN"]` SHALL include `promptHash`, list of `glossaryHits` source-term strings, count of `tmHits`, model name, provider name, and (if a custom template was used) `templateId`

#### Scenario: Failure does not pollute
- **WHEN** a translation request fails with provider error
- **THEN** `translationMeta` SHALL NOT be updated for that language
