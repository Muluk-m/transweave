## ADDED Requirements

### Requirement: ProjectTokensTab is decomposed into sub-components
`ProjectTokensTab` (917 lines) SHALL be split into a data management hook and focused sub-components, each under 300 lines.

#### Scenario: Token data logic extracted to custom hook
- **WHEN** `ProjectTokensTab` renders
- **THEN** token fetching, filtering, pagination, and form state SHALL be managed by a `useTokensManager()` hook

#### Scenario: Toolbar is a separate component
- **WHEN** the tokens tab renders its toolbar (search, filter, batch actions)
- **THEN** a `TokenToolbar` component SHALL handle the toolbar rendering and interactions

#### Scenario: Overall functionality preserved
- **WHEN** the refactored `ProjectTokensTab` is rendered
- **THEN** all existing functionality (search, filter, CRUD, batch operations, translation) SHALL work identically to before

### Requirement: TokenFormDrawer reduces prop count
`TokenFormDrawer` SHALL receive no more than 5 direct props by extracting form logic into hooks and using compound component patterns.

#### Scenario: Form state managed by hook
- **WHEN** `TokenFormDrawer` is opened for editing
- **THEN** form state, validation, and submission logic SHALL be managed by a `useTokenForm()` hook instead of being passed as 15+ props

#### Scenario: Sub-sections are independent components
- **WHEN** the form drawer renders
- **THEN** screenshot management, translation fields, and version history SHALL each be rendered by their own component (`ScreenshotManager`, `TranslationFields`, `TokenHistoryPanel`)

### Requirement: TokenTable column definitions are externalized
`TokenTable` column definitions SHALL be extracted to a separate file, reducing the main component to rendering logic only.

#### Scenario: Column definitions in separate file
- **WHEN** `TokenTable` is imported
- **THEN** column definitions SHALL come from a `columns.tsx` file in the same directory

#### Scenario: Cell renderers are standalone components
- **WHEN** a table cell is rendered
- **THEN** custom cell renderers (status badge, language pills, action buttons) SHALL be defined as standalone components, not inline functions
