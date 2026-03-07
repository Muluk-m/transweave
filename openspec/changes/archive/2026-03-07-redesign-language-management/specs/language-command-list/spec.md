## ADDED Requirements

### Requirement: Inline searchable language list
The language management section SHALL display an inline cmdk Command list that shows all 47 built-in languages, filterable by search input matching both language code and Chinese name.

#### Scenario: Search by code
- **WHEN** user types "ja" in the search input
- **THEN** the list filters to show "日语 (ja)" and any other partial matches

#### Scenario: Search by Chinese name
- **WHEN** user types "日" in the search input
- **THEN** the list filters to show "日语 (ja)"

### Requirement: Two language groups
The list SHALL display two groups: "常用" (top ~10 high-frequency languages) and "全部" (remaining languages alphabetically). During active search, groups SHALL flatten and show results by match relevance.

#### Scenario: Default display
- **WHEN** user views the language list with no search query
- **THEN** "常用" group shows en, zh-CN, zh-TW, ja, ko, fr, de, es, pt, ru at top, and "全部" group shows remaining languages alphabetically below

### Requirement: Toggle language selection
Clicking a language row SHALL toggle it between selected and unselected. Selected languages appear with a check icon and muted styling. Unselected languages are fully interactive.

#### Scenario: Add language by clicking
- **WHEN** user clicks an unselected language row (e.g., "德语 (de)")
- **THEN** the language is added to the current languages list, and the row shows a check icon with muted styling

#### Scenario: Remove language by clicking
- **WHEN** user clicks a selected language row (e.g., "法语 (fr)")
- **THEN** the language is removed from the current languages list, and the row returns to active styling

### Requirement: English is required
The "en" language row SHALL always appear checked and disabled. Users MUST NOT be able to deselect English.

#### Scenario: Attempt to remove English
- **WHEN** user views the language list
- **THEN** the "en" row is checked, visually muted, and not clickable

### Requirement: Custom language fallback
When search input does not match any built-in language, the list SHALL show a "＋ 添加自定义语言" option. Selecting it SHALL prompt for a Chinese label, then add both code and label.

#### Scenario: Add custom language
- **WHEN** user types "th-TH" which matches no built-in language
- **THEN** a "＋ 添加自定义语言 \"th-TH\"" item appears at the bottom
- **WHEN** user clicks it and enters label "泰语(泰国)"
- **THEN** "th-TH" is added to current languages with label "泰语(泰国)"

### Requirement: Remove language via badge
Users SHALL be able to remove languages by clicking the ✕ button on the current language badges at the top. This SHALL sync with the list selection state.

#### Scenario: Remove via badge updates list
- **WHEN** user clicks ✕ on the "fr" badge in current languages
- **THEN** "fr" is removed from current languages AND the "法语 (fr)" row in the list returns to unselected state
