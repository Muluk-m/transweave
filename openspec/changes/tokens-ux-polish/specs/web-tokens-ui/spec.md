## ADDED Requirements

### Requirement: Translation status badge per language
The token table SHALL display the translation status of each language cell as a colored badge derived from `translationStatus[lang]`. Color mapping SHALL follow the DESIGN.md semantic palette: draft=fg-3 (neutral), translated=info (blue 8% opacity), reviewed=warning (amber 8%), approved=success (green 8%), rejected=error (red 8%).

#### Scenario: Status badge displayed
- **WHEN** a token has `translationStatus = { "en-US": "approved", "ja-JP": "draft" }`
- **THEN** the en-US cell SHALL show a green-tinted "approved" badge and the ja-JP cell SHALL show a neutral "draft" badge

#### Scenario: Status badge tooltip
- **WHEN** the user hovers over a status badge
- **THEN** a tooltip SHALL show the status name plus its English+i18n description (e.g. "Approved — translation has been reviewed and signed off")

#### Scenario: Empty translation
- **WHEN** a language has no entry in `translationStatus`
- **THEN** no badge SHALL be shown; the cell renders as empty/missing

### Requirement: Stale translation indicator
The system SHALL flag a translation as "stale" when the source-language translation's `translationMeta.updatedAt` is later than a target language's `translationMeta.updatedAt`. The token table SHALL display a stale icon on the affected language cells.

#### Scenario: Source updated after target
- **WHEN** the source language `translationMeta["en-US"].updatedAt = 2026-05-01T10:00:00Z` and `translationMeta["zh-CN"].updatedAt = 2026-04-15T08:00:00Z`
- **THEN** the zh-CN cell SHALL display a stale icon with tooltip "Source updated 2026-05-01, translation last updated 2026-04-15"

#### Scenario: Stale filter
- **WHEN** the user activates the "stale" preset filter chip
- **THEN** the table SHALL show only tokens with at least one stale target language

### Requirement: Preset filter chips
The token toolbar SHALL provide one-click preset filter chips that compose with existing search, status, module, and tag filters. Presets: "missing-in-lang" (parameterized by selected target language), "stale", "low-confidence" (`translationMeta.confidence < 70`), "ai-translated-draft" (`source = ai` AND `status = draft`).

#### Scenario: Multiple chips active
- **WHEN** the user activates both "stale" and "low-confidence" chips
- **THEN** the table SHALL show tokens that are stale OR low-confidence (union)
- **AND** the active chip count SHALL be visible in the toolbar

#### Scenario: Chip with existing filters
- **WHEN** "ai-translated-draft" chip is active and the user types "user.profile" in the search box
- **THEN** the table SHALL show only AI-draft tokens whose key matches "user.profile"

### Requirement: Batch status mutation
The token table SHALL support batch status changes when one or more rows are selected. Available actions: "Mark as reviewed", "Mark as approved", "Mark as rejected", "Reset to draft". Each action applies to all selected tokens for the currently chosen language scope (default: all languages).

#### Scenario: Batch mark as approved
- **WHEN** the user selects 50 tokens and chooses "Mark as approved → all languages"
- **THEN** the system SHALL update `translationStatus[lang]` to "approved" for all 50 tokens × all configured languages
- **AND** show a progress bar during the operation
- **AND** trigger one `tokens.batch_completed` webhook event on completion

### Requirement: Keyboard shortcuts in token table
The system SHALL provide keyboard shortcuts to navigate and operate on tokens when the Tokens tab is active and no input/textarea is focused.

#### Scenario: Row navigation
- **WHEN** the Tokens tab is active and the user presses J or K
- **THEN** the focused row SHALL move down or up respectively, with the focused row visually indicated by a 1px primary-color border

#### Scenario: Edit shortcut
- **WHEN** a row is focused and the user presses E
- **THEN** the TokenFormDrawer SHALL open with that token loaded for editing

#### Scenario: Status shortcuts
- **WHEN** a row is focused and the user presses A or R
- **THEN** the row's translation status SHALL be set to "approved" or "rejected" respectively (default scope: all languages; configurable in user settings)

#### Scenario: Disabled in input mode
- **WHEN** any input, textarea, or contentEditable is focused
- **THEN** none of the keyboard shortcuts SHALL fire

#### Scenario: Cheatsheet
- **WHEN** the user presses ? (Shift+/) or clicks the "?" button at the bottom of the table
- **THEN** a cheatsheet overlay SHALL appear listing all shortcuts

### Requirement: Activity tab visibility
The ProjectView SHALL include an "Activity" tab that renders the existing `ProjectActivityTab` component, positioned between "files" and "setting" tabs.

#### Scenario: Activity tab present
- **WHEN** a user opens any project page
- **THEN** the project tabs list SHALL include "Activity" with an Activity icon
- **AND** clicking it SHALL display the ProjectActivityTab content
