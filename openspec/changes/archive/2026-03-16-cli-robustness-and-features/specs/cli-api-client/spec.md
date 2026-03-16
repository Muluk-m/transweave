## ADDED Requirements

### Requirement: Request timeout
The API client SHALL abort requests that exceed a configurable timeout (default 30 seconds) using AbortController. Download operations SHALL use a longer timeout of 120 seconds.

#### Scenario: Request exceeds timeout
- **WHEN** a request takes longer than the configured timeout
- **THEN** the client SHALL abort the request and throw a NetworkError with message indicating timeout

#### Scenario: Download with extended timeout
- **WHEN** `getRaw()` is called for file downloads
- **THEN** the client SHALL use 120s timeout instead of the default 30s

### Requirement: Transient error retry
The API client SHALL retry requests that fail due to network errors or 5xx server responses, up to 2 retries with exponential backoff (1s, 3s). The client SHALL NOT retry 4xx client errors.

#### Scenario: Network failure with successful retry
- **WHEN** a request fails with a network error (e.g., ECONNREFUSED)
- **AND** the retry succeeds
- **THEN** the client SHALL return the successful response transparently

#### Scenario: 5xx error with retry exhaustion
- **WHEN** a request receives 500/502/503 responses on all attempts
- **THEN** the client SHALL throw a ServerError after exhausting retries

#### Scenario: 4xx error no retry
- **WHEN** a request receives a 401, 403, or 404 response
- **THEN** the client SHALL throw immediately without retrying

### Requirement: Typed responses
The API client methods SHALL accept a generic type parameter and return `Promise<T>` instead of `Promise<any>`.

#### Scenario: Typed GET request
- **WHEN** calling `client.get<ProjectInfo>('/api/project/find/123')`
- **THEN** the return type SHALL be `Promise<ProjectInfo>`
