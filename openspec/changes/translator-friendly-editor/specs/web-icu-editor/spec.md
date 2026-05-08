## ADDED Requirements

### Requirement: ICU plural visual editor
The translation editor SHALL detect ICU plural / select / selectordinal expressions and provide a visual editing mode that exposes one input field per CLDR plural form for the target language.

#### Scenario: Detect and switch to visual mode
- **WHEN** a translation raw value matches `{varName, plural, ...}` or `{varName, select, ...}` or `{varName, selectordinal, ...}`
- **THEN** the editor SHALL display the visual editor automatically with one textarea per form
- **AND** an "Edit raw" toggle SHALL be available to fall back to raw text editing

#### Scenario: CLDR-aware form list
- **WHEN** the target language is `zh-CN`
- **THEN** the visual editor SHALL show only the `other` form (zh-CN has no plural distinctions)
- **WHEN** the target language is `en-US`
- **THEN** the editor SHALL show `one` and `other`
- **WHEN** the target language is `ar`
- **THEN** the editor SHALL show all 6 forms (`zero, one, two, few, many, other`)

#### Scenario: Hash placeholder preview
- **WHEN** a form's textarea contains "You have # items"
- **THEN** a small preview text near the textarea SHALL show "You have 5 items" (substituting `#` with a representative number per form)

#### Scenario: Round-trip preservation
- **WHEN** the user edits one form and saves
- **THEN** the raw ICU string SHALL be re-assembled with all forms intact
- **AND** re-opening the editor SHALL parse it back to the same visual state

### Requirement: Graceful degradation
The visual editor SHALL fall back to a raw textarea (with a warning) for any expression that cannot be parsed unambiguously, including malformed ICU, deeply nested select+plural+select, or unsupported expression types.

#### Scenario: Malformed ICU
- **WHEN** the raw value is `{count, plural, one {You have one} other {Items #}` (missing closing brace)
- **THEN** the editor SHALL render a raw textarea with a warning banner "Could not parse — please fix manually"

#### Scenario: Plural inside select inside plural
- **WHEN** the raw value has 3+ levels of nesting
- **THEN** the editor SHALL render the outer level visually if possible, and inner levels as collapsed raw blocks marked "Advanced — edit as raw"
