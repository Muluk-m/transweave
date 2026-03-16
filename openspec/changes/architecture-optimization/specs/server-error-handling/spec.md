## ADDED Requirements

### Requirement: Global exception filter catches all unhandled errors
The system SHALL register a global `ExceptionFilter` that intercepts all uncaught exceptions and returns a standardized error response.

#### Scenario: HttpException is thrown
- **WHEN** a controller or service throws an `HttpException` (e.g., `NotFoundException`, `ForbiddenException`)
- **THEN** the filter SHALL return the exception's status code and message in the standardized format

#### Scenario: Database unique constraint violation (code 23505)
- **WHEN** a database operation triggers a unique constraint violation
- **THEN** the filter SHALL return HTTP 409 Conflict with message "Resource already exists"

#### Scenario: Unknown internal error
- **WHEN** an unexpected error occurs that is not an `HttpException`
- **THEN** the filter SHALL return HTTP 500 with message "Internal server error" and SHALL NOT expose internal error details to the client

#### Scenario: Error logging
- **WHEN** any error is caught by the filter
- **THEN** the filter SHALL log the full error stack trace using NestJS Logger

### Requirement: Standardized error response format
All error responses SHALL follow a consistent JSON structure containing `statusCode`, `message`, `error`, and `requestId` fields.

#### Scenario: Error response includes request ID
- **WHEN** an error response is returned
- **THEN** the response body SHALL include the `requestId` from the request header (set by `RequestIdMiddleware`)

#### Scenario: Development mode shows stack trace
- **WHEN** the application is running in development mode AND an error occurs
- **THEN** the error response SHALL include an additional `stack` field with the error stack trace

### Requirement: Remove inline database error catching
Existing inline catches for database error codes (e.g., `error?.code === '23505'` in `TokenService`) SHALL be removed in favor of the global exception filter.

#### Scenario: Token creation with duplicate key
- **WHEN** a token is created with a key that already exists in the same project
- **THEN** the global exception filter SHALL catch the database error and return HTTP 409 Conflict
