## ADDED Requirements

### Requirement: Whoami command displays current identity
`transweave whoami` SHALL call `GET /api/auth/status` and display the current user's name, email, server URL, and the currently configured project (from `.transweave.json` if present).

#### Scenario: Authenticated with project configured
- **WHEN** `transweave whoami` is run with valid credentials and a project config
- **THEN** the CLI SHALL display user name, email, server URL, project name, and project ID

#### Scenario: Authenticated without project
- **WHEN** `transweave whoami` is run with valid credentials but no `.transweave.json`
- **THEN** the CLI SHALL display user info and server URL, and note "No project configured (run `transweave init`)"

#### Scenario: Not authenticated
- **WHEN** `transweave whoami` is run without credentials
- **THEN** the CLI SHALL display "Not logged in. Run `transweave login` to authenticate."
