## ADDED Requirements

### Requirement: SDK packages provide ALT+click in-context editing
The system SHALL ship four npm packages: `@transweave/sdk-core`, `@transweave/sdk-react`, `@transweave/sdk-vue`, `@transweave/sdk-svelte`. In dev mode, holding ALT and clicking any element rendered by an i18n call SHALL open an inline modal that lets the developer edit the underlying token's translation and upload a screenshot of the element to the Transweave server.

#### Scenario: ALT+click in dev mode
- **WHEN** a Next.js app uses `<TransweaveProvider mode="dev">` and the user ALT+clicks a `<span>` rendered by `useTranslations()` for key `user.profile.title`
- **THEN** the SDK SHALL open a modal pre-filled with the current translation
- **AND** SHALL offer Save / Cancel actions

#### Scenario: Screenshot attached on save
- **WHEN** the user saves the modal
- **THEN** the SDK SHALL POST a PNG screenshot of the clicked element (with 5px padding) to `/api/screenshots`
- **AND** SHALL associate the screenshot with the token

#### Scenario: Production mode has zero runtime
- **WHEN** the same app is built with `<TransweaveProvider mode="prod">`
- **THEN** the production bundle SHALL include no ALT+click listener, no html2canvas dependency, and no Transweave API client
- **AND** the gzip size attributable to `@transweave/sdk-react` SHALL be ≤ 1KB

### Requirement: Dev token has restricted scope
SDK-issued API tokens SHALL carry the `inContextEdit` scope. The server SHALL reject any request from such a token to endpoints not explicitly whitelisted for that scope (project listing, billing, team management, etc.).

#### Scenario: Restricted endpoint denied
- **WHEN** an `inContextEdit` token calls `GET /api/projects` (project listing)
- **THEN** the server SHALL respond with HTTP 403 and not return any project data

#### Scenario: Whitelisted endpoint allowed
- **WHEN** an `inContextEdit` token calls `PUT /api/tokens/<id>` (single-token update)
- **THEN** the server SHALL allow the call subject to normal token-level permission checks
