## ADDED Requirements

### Requirement: Structured error classes
The CLI SHALL define a TransweaveError base class with subclasses: AuthError (401/403), NotFoundError (404), NetworkError (timeout/connection), ServerError (5xx). Each error SHALL carry `statusCode`, `endpoint`, and a user-friendly `hint` property.

#### Scenario: Auth error with hint
- **WHEN** the server returns 401
- **THEN** the CLI SHALL throw AuthError with hint "Run `transweave login` to authenticate"

#### Scenario: Not found error
- **WHEN** the server returns 404
- **THEN** the CLI SHALL throw NotFoundError with the endpoint path in the message

### Requirement: Semantic exit codes
The CLI SHALL use exit codes: 0 for success, 1 for general error, 2 for partial failure (some operations succeeded, some failed), 3 for authentication failure.

#### Scenario: Auth failure exit code
- **WHEN** a command fails due to missing or invalid API key
- **THEN** the process SHALL exit with code 3

#### Scenario: Partial push failure
- **WHEN** `push` succeeds for some languages but fails for others
- **THEN** the process SHALL exit with code 2

### Requirement: Shared auth and project guards
The CLI SHALL provide `ensureAuth()` and `ensureProject()` utility functions that load configuration and throw descriptive errors if prerequisites are missing. Commands SHALL use these instead of inline checks.

#### Scenario: Missing API key
- **WHEN** a command requiring auth runs without a configured API key
- **THEN** `ensureAuth()` SHALL throw AuthError with hint to run `transweave login`

#### Scenario: Missing project config
- **WHEN** a command requiring project context runs without `.transweave.json`
- **THEN** `ensureProject()` SHALL throw an error with hint to run `transweave init`
