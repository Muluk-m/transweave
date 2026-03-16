## ADDED Requirements

### Requirement: Status command shows translation progress
`transweave status` SHALL fetch per-language translation progress from `GET /api/tokens/:projectId/progress` and display it as a table with language code, translated/total counts, and a visual progress bar.

#### Scenario: Display progress for all languages
- **WHEN** `transweave status` is run with a valid project config
- **THEN** the CLI SHALL display a table with columns: Language, Translated, Progress (bar + percentage)
- **AND** display the overall completion percentage at the bottom

#### Scenario: Empty project
- **WHEN** the project has no tokens
- **THEN** the CLI SHALL display "No translation keys found in this project"

### Requirement: Fail-under threshold
`transweave status --fail-under <percentage>` SHALL exit with code 1 if the overall translation coverage is below the specified threshold.

#### Scenario: Coverage above threshold
- **WHEN** `transweave status --fail-under 80` is run and overall coverage is 95%
- **THEN** the process SHALL exit with code 0

#### Scenario: Coverage below threshold
- **WHEN** `transweave status --fail-under 90` is run and overall coverage is 85%
- **THEN** the process SHALL exit with code 1 and display a message indicating the threshold was not met
