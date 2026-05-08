## ADDED Requirements

### Requirement: MCP tool inventory expanded
The MCP server SHALL register the following tools in addition to the existing 11 (List Projects, List/Get/Create/Update/Delete Token, Translate Text, Search Tokens, QA Check Token/Project, List Glossary):

- `lint_token`, `lint_project`
- `detect_unused_keys`, `suggest_key_name`
- `create_glossary_entry`, `update_glossary_entry`, `delete_glossary_entry`
- `query_tm`, `add_tm_entry`, `list_tm`
- `set_translation_status`
- `batch_translate`
- `list_activity`
- `screenshot_attach`

#### Scenario: All new tools discoverable
- **WHEN** an MCP client calls `tools/list` against the Transweave MCP server
- **THEN** the response SHALL include all 14 new tools above

### Requirement: All tools enforce projectId
Every new tool whose action touches project-scoped data SHALL require `projectId` in its input schema and MUST verify the caller has access to that project before executing.

#### Scenario: Missing projectId is rejected
- **WHEN** any new tool is invoked without `projectId`
- **THEN** the server SHALL return a validation error before performing any DB read or write

#### Scenario: Cross-project token id is rejected
- **WHEN** `update_glossary_entry` is called with `projectId=A` but the glossary entry belongs to project B
- **THEN** the call SHALL return a not-found error and SHALL NOT modify any data

### Requirement: Mutating tools return diff
Every tool that mutates state (`create_*`, `update_*`, `delete_*`, `set_translation_status`, `batch_translate`, `add_tm_entry`, `screenshot_attach`) SHALL return a `before` and `after` object in its result. `before` MAY be null for create operations; `after` MAY be null for delete operations.

#### Scenario: Update returns diff
- **WHEN** `update_glossary_entry` modifies an entry
- **THEN** the result SHALL include `{ before: <prior state>, after: <new state> }`

### Requirement: List tools support cursor pagination
Every new list-style tool (`list_tm`, `list_activity`) SHALL accept an optional `cursor` input and return `nextCursor` (null when no more pages) alongside the items.

#### Scenario: Pagination round-trip
- **WHEN** `list_activity` is called with `cursor="abc"` and limit 50
- **THEN** the response SHALL include up to 50 items and `nextCursor` (string or null)
