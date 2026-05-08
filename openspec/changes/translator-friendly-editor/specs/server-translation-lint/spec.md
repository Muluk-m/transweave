## ADDED Requirements

### Requirement: Translation lint engine
The server SHALL provide a lint engine that evaluates translations against a fixed set of rules. Saving a translation SHALL NOT block on lint failures, but lint issues SHALL be returned in the response and persisted as part of QA state for later review.

Rules:
- `placeholder-mismatch` (error): the set of placeholders in the source and target differ
- `html-tag-mismatch` (error): paired tags `<N>...</N>` present in source must be present and balanced in target
- `icu-syntax-invalid` (error): the target text fails ICU MessageFormat parsing
- `unescaped-apostrophe` (warning): a single `'` not in `''` pair in an ICU expression
- `length-overflow` (warning): target length exceeds the configured `maxLength` for the token's module/project

#### Scenario: Placeholder mismatch
- **WHEN** source is `Hello {name}, you have {count} items` and target is `你好 {name}，你有几个东西`
- **THEN** lint SHALL return `{ rule: "placeholder-mismatch", severity: "error", missing: ["{count}"] }`

#### Scenario: HTML tag mismatch
- **WHEN** source is `Click <0>here</0> to start` and target is `点击开始`
- **THEN** lint SHALL return `{ rule: "html-tag-mismatch", severity: "error" }`

#### Scenario: ICU syntax error
- **WHEN** target is `{count, plural, one {一个} other {# 个}` (missing closing brace)
- **THEN** lint SHALL return `{ rule: "icu-syntax-invalid", severity: "error", parserError: "..." }`

#### Scenario: Length overflow
- **WHEN** the token's module sets `maxLength=20` and target length is 35
- **THEN** lint SHALL return `{ rule: "length-overflow", severity: "warning", actualLength: 35, maxLength: 20 }`

#### Scenario: No issues
- **WHEN** all rules pass
- **THEN** lint SHALL return an empty array

### Requirement: Lint runs on save
`TokenService.create / update / batchUpdate` SHALL run lint for every modified language and return `lintIssues` in the response payload (added field, backward compatible).

#### Scenario: Save with errors
- **WHEN** a user saves a token with placeholder-mismatch issues
- **THEN** the save SHALL succeed (HTTP 200)
- **AND** the response body SHALL include `lintIssues: [{ language, rule, severity, message }, ...]`

### Requirement: Project-wide lint API
The system SHALL expose `POST /api/projects/:id/lint` that runs lint across all tokens in a project and returns aggregated issues, suitable for a project-health dashboard.

#### Scenario: Project lint summary
- **WHEN** a user calls the endpoint for a project with 1000 tokens
- **THEN** the system SHALL return `{ totalIssues, byRule: { ruleName: count }, samples: [{ tokenId, key, language, rule, severity, message }] }` (samples capped at 100 to keep payload small)
