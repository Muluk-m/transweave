## ADDED Requirements

### Requirement: Token lifecycle events emitted to webhooks
The server SHALL emit webhook events for the following token lifecycle changes: `token.created`, `token.updated`, `token.deleted`, `token.translated`, `token.status_changed`. The TokenService SHALL invoke the webhook delivery pipeline asynchronously after the corresponding database operation commits successfully.

#### Scenario: Token created event
- **WHEN** a user creates a new token via `POST /api/projects/:id/tokens`
- **AND** there is at least one active webhook subscribed to `token.created` for that project
- **THEN** the system SHALL POST to each subscribed webhook URL with payload `{ event: "token.created", projectId, tokenId, key, module, occurredAt, actorId }`

#### Scenario: Status change event
- **WHEN** a translation status changes from "translated" to "approved"
- **THEN** the system SHALL emit `token.status_changed` with payload including `{ language, fromStatus, toStatus }`

#### Scenario: Failed delivery does not break business path
- **WHEN** a webhook URL returns 500 or times out
- **THEN** the originating token API call SHALL still return success
- **AND** the failure SHALL be recorded in `activity_logs` with type `webhook_failed`

### Requirement: Batch operation events
For batch operations (importTokens, batchTranslate, batchSetStatus, batchSetModule, batchSetTags), the system SHALL emit a single `tokens.batch_completed` event instead of N per-token events.

#### Scenario: Batch translate
- **WHEN** a batch translate of 100 tokens completes
- **THEN** exactly one `tokens.batch_completed` event SHALL fire with payload `{ projectId, mode: "translate", count: 100, succeeded, failed, durationMs, occurredAt }`

#### Scenario: Batch import
- **WHEN** an import operation creates 50 tokens and updates 30
- **THEN** exactly one `tokens.batch_completed` event SHALL fire with `{ mode: "import", created: 50, updated: 30 }`

### Requirement: HMAC-SHA256 webhook signature
Webhook deliveries SHALL include an `X-Transweave-Signature: sha256=<hex>` header containing an HMAC-SHA256 of the raw request body using the webhook's `secret` as the key.

#### Scenario: Signature verification
- **WHEN** a webhook is delivered with body `{...}` and secret `s3cret`
- **THEN** the request SHALL include header `X-Transweave-Signature: sha256=<hmac-sha256(s3cret, body) as hex>`

#### Scenario: Signature is timing-safe verifiable
- **WHEN** a receiver computes HMAC-SHA256 of the body with the shared secret
- **THEN** comparing it to the `X-Transweave-Signature` header value with a constant-time comparison SHALL match

### Requirement: Webhook event documentation
The repository SHALL include `docs/webhook-events.md` documenting all event types, their payload shapes, signature verification, and example receiver code in Node.js, Python, and Go.

#### Scenario: Doc completeness
- **WHEN** a developer reads `docs/webhook-events.md`
- **THEN** they SHALL find: (1) full list of event names, (2) JSON Schema or example for each payload, (3) signature header format and verification snippet, (4) retry/failure semantics statement
