## ADDED Requirements

### Requirement: Project-level version control toggle
The system SHALL store an `enableVersioning` boolean field on each project, defaulting to `true`. When disabled, the system SHALL NOT create token history records on token create or update. Existing history records SHALL be preserved when the toggle is turned off.

#### Scenario: New project has versioning enabled by default
- **WHEN** a new project is created
- **THEN** `enableVersioning` SHALL be `true`

#### Scenario: Disable versioning stops history recording
- **WHEN** a project's `enableVersioning` is set to `false`
- **AND** a token's translations are updated
- **THEN** no new `token_history` record SHALL be created

#### Scenario: Re-enable versioning resumes history recording
- **WHEN** a project's `enableVersioning` is changed from `false` to `true`
- **AND** a token's translations are updated
- **THEN** a new `token_history` record SHALL be created

#### Scenario: Existing history preserved when disabled
- **WHEN** a project's `enableVersioning` is set to `false`
- **THEN** all existing `token_history` records for that project's tokens SHALL remain accessible

### Requirement: Token version restore
The system SHALL provide an API endpoint `POST /api/token/:tokenId/restore/:historyId` that restores a token's translations to a specific historical version. The restore operation SHALL fully replace the token's current translations with the historical translations. The restore operation SHALL create a new history record to maintain an audit trail.

#### Scenario: Successful restore
- **WHEN** a user calls `POST /api/token/:tokenId/restore/:historyId` with a valid token ID and history ID
- **THEN** the token's translations SHALL be fully replaced with the translations from the specified history record
- **AND** a new `token_history` record SHALL be created with the restored translations
- **AND** an activity log entry of type `TOKEN_UPDATE` SHALL be created

#### Scenario: Restore with mismatched history
- **WHEN** a user calls the restore endpoint with a history ID that does not belong to the specified token
- **THEN** the system SHALL return a `404 Not Found` error

#### Scenario: Restore when versioning is disabled
- **WHEN** a project's `enableVersioning` is `false`
- **AND** a user calls the restore endpoint
- **THEN** the restore SHALL still succeed (restore operates on existing history, not new recording)
- **AND** no new history record SHALL be created (since versioning is off)

### Requirement: Advanced settings UI cleanup
The frontend advanced settings tab SHALL remove the "Enable Comments" and "Public Project" toggles. The "Auto Translation" toggle SHALL be visually disabled with a "Coming Soon" badge. The "Version Control" toggle SHALL persist its value to the backend via the `updateProject` API.

#### Scenario: Auto translate shows Coming Soon
- **WHEN** the user views the advanced settings tab
- **THEN** the "Auto Translation" toggle SHALL be disabled (non-interactive)
- **AND** a "Coming Soon" badge SHALL be displayed next to it

#### Scenario: Version control toggle persists
- **WHEN** the user toggles version control and saves
- **THEN** the `enableVersioning` value SHALL be sent to the backend via `updateProject`
- **AND** on next page load, the toggle SHALL reflect the saved value

#### Scenario: Removed settings not shown
- **WHEN** the user views the advanced settings tab
- **THEN** the "Enable Comments" and "Public Project" toggles SHALL NOT be present
