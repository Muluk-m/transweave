## ADDED Requirements

### Requirement: React Query manages team and project server state
Teams and projects data SHALL be fetched and cached using `@tanstack/react-query`, replacing the current Jotai atoms (`teamsAtom`, `projectsAtom`) for server state management.

#### Scenario: Teams data is automatically cached
- **WHEN** the sidebar loads and fetches teams
- **THEN** React Query SHALL cache the response and subsequent accesses SHALL use the cached data without additional API calls

#### Scenario: Cache invalidation on team mutation
- **WHEN** a team is created, updated, or deleted
- **THEN** the teams query cache SHALL be automatically invalidated and refetched

#### Scenario: Cache invalidation on project mutation
- **WHEN** a project is created, updated, or deleted
- **THEN** the projects query cache SHALL be automatically invalidated and refetched

### Requirement: Jotai atoms retained for client-only selection state
`nowTeamAtom` and `nowProjectAtom` SHALL remain as Jotai atoms for tracking the user's current selection. `teamsAtom` and `projectsAtom` SHALL be removed.

#### Scenario: Current team selection persists across navigation
- **WHEN** a user selects a team and navigates to another page
- **THEN** `nowTeamAtom` SHALL retain the selected team

#### Scenario: teamsAtom and projectsAtom are removed
- **WHEN** the refactoring is complete
- **THEN** no code SHALL reference `teamsAtom` or `projectsAtom` from Jotai

### Requirement: QueryClientProvider is configured at app root
A `QueryClientProvider` SHALL be added to the app root layout, wrapping the application with React Query context.

#### Scenario: React Query DevTools available in development
- **WHEN** the app runs in development mode
- **THEN** React Query DevTools SHALL be available for debugging query state

### Requirement: Upload API uses unified apiClient
The `upload.ts` API module SHALL use the shared `apiClient` instead of raw `fetch()`, ensuring consistent error handling and authentication.

#### Scenario: Upload request includes auth token
- **WHEN** a file upload is initiated via the upload API
- **THEN** the request SHALL include the authentication token via `apiClient`'s built-in auth handling
