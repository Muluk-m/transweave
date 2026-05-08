## ADDED Requirements

### Requirement: Prompt template entity
The system SHALL persist AI prompt templates as first-class entities. Each template SHALL have: `id`, `scope` (one of `team` | `project`), `scopeId`, `kind` (one of `translate` | `translate_plural` | `translate_batch` | `tone_adjust`), `name`, `body` (string with `{{variable}}` placeholders), `variables` (jsonb metadata for documentation), `isDefault` (boolean — only one default per `scope+scopeId+kind`), `createdBy`, `createdAt`, `updatedAt`.

#### Scenario: Create project-scoped template
- **WHEN** a user with project edit permission calls `POST /api/ai/prompt-templates` with `{ scope: "project", scopeId: "p1", kind: "translate", name: "Tech docs voice", body: "..." }`
- **THEN** the system SHALL create the template and return it with id

#### Scenario: One default per scope/kind
- **WHEN** a template with `isDefault=true` is created or updated for `(scope, scopeId, kind)` and another already had `isDefault=true`
- **THEN** the older template's `isDefault` SHALL be set to `false` atomically

### Requirement: Three-layer cascade resolution
When the AI service needs to render a prompt for a translation, it SHALL resolve the effective template using cascade: project default → team default → built-in default. The first non-null match wins.

#### Scenario: Project override
- **WHEN** a project has a default `translate` template and the team also has one
- **THEN** the project template SHALL be used

#### Scenario: Team fallback
- **WHEN** a project has no `translate` template but its team does
- **THEN** the team template SHALL be used

#### Scenario: Built-in fallback
- **WHEN** neither project nor team has a `translate_batch` template
- **THEN** the built-in default SHALL be used

### Requirement: Variable interpolation
Template bodies SHALL support `{{variable}}` interpolation. Standard variables: `sourceText`, `sourceLang`, `targetLang`, `glossaryTerms`, `tmMatches`, `toneStyle`, `customInstructions`. Unknown variables SHALL be left intact in the rendered output and logged as warning.

#### Scenario: All variables resolve
- **WHEN** a template body contains `Translate "{{sourceText}}" from {{sourceLang}} to {{targetLang}}`
- **AND** the rendering call provides `{ sourceText: "Hello", sourceLang: "en", targetLang: "zh-CN" }`
- **THEN** the rendered body SHALL be `Translate "Hello" from en to zh-CN`

#### Scenario: Unknown variable
- **WHEN** a template body contains `{{unknownVar}}`
- **THEN** the rendered output SHALL contain `{{unknownVar}}` literally
- **AND** a warning SHALL be logged with template id and variable name

### Requirement: Built-in template set
The system SHALL ship with built-in default templates for all four kinds (`translate`, `translate_plural`, `translate_batch`, `tone_adjust`). These SHALL be code-defined (not seeded into DB) so that updating the codebase updates the defaults for all installations without migrations.

#### Scenario: Update propagation
- **WHEN** the codebase is upgraded with a refined built-in `translate` template
- **AND** a project has not overridden it
- **THEN** subsequent translation requests SHALL use the new built-in template
