## ADDED Requirements

### Requirement: Publish-driven bundle generation
The system SHALL only generate a new translation bundle when an explicit `POST /api/projects/:id/publish` action is invoked. Draft edits SHALL never affect the CDN-served bundle.

#### Scenario: Draft edit doesn't affect CDN
- **WHEN** a translator edits a token's translation but no publish is triggered
- **THEN** the response of `GET /cdn/projects/:id/translations.json` SHALL remain unchanged (same ETag)

#### Scenario: Publish creates new bundle
- **WHEN** `POST /api/projects/:id/publish` is invoked
- **THEN** the system SHALL collect all main-branch token translations, compute SHA-256, and write a row to `published_bundles`
- **AND** subsequent CDN fetches SHALL return the new bundle and new ETag

### Requirement: CDN response is cacheable and conditional
The `GET /cdn/projects/:id/translations.json` endpoint SHALL set `Cache-Control: public, max-age=60, stale-while-revalidate=300` and a strong `ETag` header. It SHALL respect `If-None-Match` requests and return 304 when the ETag matches.

#### Scenario: Conditional GET returns 304
- **WHEN** a client sends `If-None-Match: <current ETag>` for a project
- **THEN** the server SHALL respond with 304 Not Modified and an empty body

### Requirement: SSE notifies clients of new bundles
The system SHALL expose `GET /cdn/projects/:id/events` as an SSE stream emitting `bundle_published` events containing `{ etag, publishedAt }` whenever a new bundle is committed.

#### Scenario: SSE event on publish
- **WHEN** a client is connected to the SSE stream and `POST /api/projects/:id/publish` is invoked
- **THEN** the client SHALL receive a `bundle_published` event with the new etag within 2 seconds

### Requirement: TypeScript types generation via CLI
The CLI SHALL provide `transweave types --out <file>` that fetches the latest published bundle and generates a TypeScript interface mapping every key to `string`. A `--watch` flag SHALL keep the file in sync via the SSE stream.

#### Scenario: One-shot types generation
- **WHEN** `transweave types --out src/i18n/types.ts` runs against a project with 1234 keys
- **THEN** the file SHALL be created/replaced with `interface Messages { ... }` containing 1234 properties

#### Scenario: Watch mode auto-regenerates
- **WHEN** `transweave types --watch --out src/i18n/types.ts` is running and a new bundle is published
- **THEN** the file SHALL be regenerated within 5 seconds of the publish event
