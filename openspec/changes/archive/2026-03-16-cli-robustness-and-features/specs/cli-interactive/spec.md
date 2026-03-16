## ADDED Requirements

### Requirement: Interactive login
When `transweave login` is invoked without `--server` and `--api-key` flags in a TTY environment, the CLI SHALL prompt the user interactively for server URL and API key using @clack/prompts.

#### Scenario: Interactive login in TTY
- **WHEN** `transweave login` is run without flags in a TTY terminal
- **THEN** the CLI SHALL prompt for server URL (with default `http://localhost:3001`) and API key
- **AND** validate the API key against the server before saving

#### Scenario: Non-TTY without flags
- **WHEN** `transweave login` is run without flags in a non-TTY environment (e.g., CI)
- **THEN** the CLI SHALL exit with an error message listing the required flags

#### Scenario: Flags override interactive
- **WHEN** `transweave login --server X --api-key tw_Y` is run
- **THEN** the CLI SHALL use the provided flags without prompting, regardless of TTY status

### Requirement: Interactive init with project selection
When `transweave init` is invoked without `--project-id` in a TTY environment, the CLI SHALL fetch the user's accessible projects via `GET /api/project/all` and present a selection list.

#### Scenario: Interactive project selection
- **WHEN** `transweave init` is run without `--project-id` in a TTY terminal
- **THEN** the CLI SHALL display a list of projects (name, languages, key count) and let the user select one
- **AND** prompt for output directory (default `./src/locales`) and format (default `json`)

#### Scenario: No accessible projects
- **WHEN** the user has no projects accessible via their API key
- **THEN** the CLI SHALL display a message suggesting to create a project in the Web UI

#### Scenario: Flag provided skips interactive
- **WHEN** `transweave init --project-id XXX` is run
- **THEN** the CLI SHALL use the provided project ID without prompting
