## ADDED Requirements

### Requirement: Backward-compatible API evolution
All API changes introduced by child changes (`mcp-tools-v2`, `token-version-snapshots`, `sdk-in-context-editing`, `cdn-distribution-and-types`) SHALL preserve existing API contracts. Old clients (CLI v1.x, REST consumers) SHALL continue to work against the new server without code changes.

#### Scenario: Old CLI works after branch model lands
- **WHEN** a CLI v1.0 binary calls `POST /api/projects/:id/tokens` (no branch parameter)
- **AND** the server has been upgraded with the branch model
- **THEN** the request SHALL succeed and act on the `main` branch implicitly

#### Scenario: REST consumer reads token without branch field
- **WHEN** a REST client calls `GET /api/projects/:id/tokens` and ignores any new fields
- **THEN** the response SHALL still include all original fields with their original semantics

### Requirement: SDK dev-mode isolation
The Transweave SDK packages SHALL be designed so that all in-context editing logic, ALT+click handlers, html2canvas dependencies, and API calls are entirely tree-shakeable in production builds. The production bundle of `<TransweaveProvider mode="prod">` SHALL be no more than 1KB after gzip.

#### Scenario: Production bundle size
- **WHEN** a Next.js or Vite app imports `<TransweaveProvider mode="prod">` and runs `next build` / `vite build`
- **THEN** the resulting bundle SHALL contain no html2canvas / no overlay code
- **AND** the gzip size attributable to `@transweave/sdk-react` SHALL be ≤ 1KB

#### Scenario: Dev mode token scoping
- **WHEN** the SDK is initialized in dev mode with an API token
- **THEN** the token SHALL only carry `inContextEdit` scope
- **AND** the server SHALL reject any request from this token outside that scope (e.g. project listing, billing) with 403

### Requirement: SDK never owns the i18n read path
The Transweave SDK SHALL NOT be on the critical path of any i18n string lookup at runtime. Host applications continue to use their own i18n library (next-intl, react-i18next, vue-i18n, svelte-i18n). The SDK only adds dev-mode overlays, click handlers, and screenshot upload — none of which the host's text rendering depends on.

#### Scenario: Production application stays alive when SDK fails to load
- **WHEN** a Next.js host application has `<TransweaveProvider>` and the SDK script fails to load (network error, blocked by CSP, 404)
- **THEN** the host's i18n strings SHALL still render correctly via the host i18n library
- **AND** no console error from the host application SHALL be raised by the absence of the SDK

#### Scenario: Dev API unreachable hides overlay only
- **WHEN** the SDK is in dev mode and the Transweave API returns 503 (server down) on the heartbeat call
- **THEN** the ALT+click overlay SHALL be hidden and a single warning logged to console
- **AND** the host i18n library SHALL continue to render strings without any blocking call to the SDK

#### Scenario: Production build excludes failure paths
- **WHEN** an app builds with `<TransweaveProvider mode="prod">`
- **THEN** the production bundle SHALL contain zero code paths that call the Transweave API for i18n reads
- **AND** the only SDK code present in production SHALL be the Provider stub (≤ 1KB gzip per the dev-mode isolation requirement)

### Requirement: MCP tool semantic stability
When new MCP tools are added or existing tools are modified, the system SHALL maintain backward compatibility with previously documented tools. Specifically: tool names SHALL NOT change once published, input schema fields SHALL only be added (never renamed or removed), and output schemas SHALL only add fields (never change types of existing fields).

#### Scenario: New tool added
- **WHEN** `mcp-tools-v2` adds a new tool `detect_unused_keys`
- **THEN** an existing AI agent that relies on the previous 11 tools SHALL continue to function unchanged

#### Scenario: Existing tool input extended
- **WHEN** `list_tokens` gains a new optional `branch` parameter
- **THEN** existing callers that omit it SHALL receive the same response as before
