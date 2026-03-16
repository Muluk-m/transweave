## ADDED Requirements

### Requirement: Search command queries tokens
`transweave search <query>` SHALL call `GET /api/tokens/:projectId/search` with the query string and display matching tokens in a table.

#### Scenario: Search by keyword
- **WHEN** `transweave search "button"` is run
- **THEN** the CLI SHALL display matching token keys and their translations in a table format

#### Scenario: Search with filters
- **WHEN** `transweave search "save" --module common --status incomplete` is run
- **THEN** the CLI SHALL pass module and status filters to the API and display filtered results

#### Scenario: No results
- **WHEN** a search returns no matches
- **THEN** the CLI SHALL display "No tokens found matching '<query>'"

### Requirement: Search pagination
When search results exceed one page, the CLI SHALL display the total count and current page info.

#### Scenario: Paginated results
- **WHEN** search returns more than 50 results
- **THEN** the CLI SHALL display the first page with a note "Showing 1-50 of N results. Use --page 2 to see more."
