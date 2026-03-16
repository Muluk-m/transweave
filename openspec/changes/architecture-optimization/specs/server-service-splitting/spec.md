## ADDED Requirements

### Requirement: TokenService handles only core CRUD and search operations
`TokenService` SHALL be responsible only for token CRUD, search, batch operations, and language progress queries. Version history and import/export logic SHALL be delegated to separate services.

#### Scenario: Token CRUD operations remain in TokenService
- **WHEN** a token is created, updated, deleted, or queried
- **THEN** `TokenService` SHALL handle the operation directly

#### Scenario: Token search with filtering
- **WHEN** tokens are searched with query, module, status, or language filters
- **THEN** `TokenService` SHALL execute the search and return paginated results

### Requirement: TokenHistoryService manages version history
A new `TokenHistoryService` SHALL handle all token version history operations including recording changes, querying history, and restoring versions.

#### Scenario: Record token change history
- **WHEN** a token value is modified
- **THEN** `TokenHistoryService.recordChange()` SHALL create a history entry with the old and new values

#### Scenario: Query token history
- **WHEN** the history of a specific token is requested
- **THEN** `TokenHistoryService` SHALL return the version history ordered by creation time

#### Scenario: Restore token to previous version
- **WHEN** a token restoration to a specific version is requested
- **THEN** `TokenHistoryService` SHALL update the token with the historical values and record the restoration as a new history entry

### Requirement: TokenImportExportService manages import and export
A new `TokenImportExportService` SHALL handle token import preview, import execution, export preview, and bulk import/export operations.

#### Scenario: Import preview
- **WHEN** an import preview is requested with file data
- **THEN** `TokenImportExportService` SHALL parse the data, compare with existing tokens, and return a preview of changes without modifying the database

#### Scenario: Export tokens
- **WHEN** project tokens are exported
- **THEN** `TokenImportExportService` SHALL format and return the tokens in the requested format

### Requirement: ProjectExportService manages project export and import
A new `ProjectExportService` SHALL handle project-level export and import operations, separated from core `ProjectService` CRUD.

#### Scenario: Project export
- **WHEN** a project export is requested with a specific format
- **THEN** `ProjectExportService` SHALL generate the export file using the format utilities

#### Scenario: Project import
- **WHEN** translation data is imported into a project
- **THEN** `ProjectExportService` SHALL parse, validate, and merge the imported data
