## ADDED Requirements

### Requirement: Token-level Ask Agent entry point
The token table SHALL provide a per-row "Ask Agent" action that opens the existing AgentChat sheet with token-specific context pre-injected. The TokenFormDrawer SHALL also expose the same entry point.

#### Scenario: Click Ask Agent from row
- **WHEN** the user clicks the Bot icon in a token row's action column
- **THEN** the AgentChat sheet SHALL open
- **AND** the conversation SHALL begin with a system message containing token context: `key`, `module`, source-language text, all current translations, screenshot URLs (if any), tags

#### Scenario: Click Ask Agent from drawer
- **WHEN** the user clicks "Ask Agent about this token" inside the open TokenFormDrawer
- **THEN** the same context-injected AgentChat session SHALL be opened (drawer remains open beneath)

### Requirement: Quick prompt chips when token context active
When AgentChat has an active token context, the input area SHALL display three quick-prompt chips above the text input: "Suggest 3 alternatives", "Why this translation?", "Run lint check on this token". Clicking a chip SHALL submit the corresponding pre-defined prompt.

#### Scenario: Click "Suggest 3 alternatives"
- **WHEN** AgentChat is in token context mode and the user clicks the "Suggest 3 alternatives" chip
- **THEN** the agent SHALL receive a user message instructing it to provide 3 alternative translations for the active token's target languages with brief rationale for each

#### Scenario: Chips hidden without context
- **WHEN** AgentChat is opened without token context (project-level)
- **THEN** quick-prompt chips SHALL NOT be shown

### Requirement: Token context lifecycle
A token context SHALL persist while the AgentChat sheet is open and pinned to a single token. Switching to a different token (e.g. clicking another row's Bot icon) SHALL replace the context atomically, clearing the previous conversation.

#### Scenario: Switch tokens mid-session
- **WHEN** the user has an open AgentChat for token A with several messages
- **AND** the user clicks Ask Agent on token B's row
- **THEN** the existing conversation SHALL be cleared
- **AND** a fresh conversation SHALL start with token B's context (after a confirm dialog "End current chat and switch?")

#### Scenario: Close sheet
- **WHEN** the user closes the AgentChat sheet
- **THEN** the token context SHALL be cleared from the global atom
