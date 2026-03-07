# Redesign Language Management

## Problem

The current language management UI in project settings has poor usability:

1. **Two competing add mechanisms** — A manual code+label input form AND a 47-badge clickable grid. Users don't know which to use.
2. **47 language badges as a flat wall** — No search, no grouping, no hierarchy. Finding a language requires scanning the entire grid.
3. **Ambiguous toggle semantics** — Clicking a colored badge isn't clearly "add" or "remove". Selected vs unselected states lack clarity.
4. **Redundant state display** — "Current languages" at top AND highlight colors in the badge grid both represent selection state.

## Solution

Replace the three-section layout (current languages + manual input + badge wall) with a two-section layout:

1. **Current languages** — Badge tags with ✕ remove buttons (keep as-is)
2. **Inline searchable Command list** — A `cmdk`-based filterable checklist replacing both the manual input form and the badge grid

### Design

```
当前语种 (5)
[en] [fr ✕] [ja ✕] [ko ✕] [zh-CN ✕]

添加语种
┌──────────────────────────────────┐
│ 🔍 搜索语言...                    │
├──────────────────────────────────┤
│ 常用                              │
│ ✓ 英语 (en)              greyed  │
│ ✓ 法语 (fr)              greyed  │
│ ○ 德语 (de)              active  │
│ ○ 西班牙语 (es)           active  │
│ ...                              │
│ ──────────                       │
│ 全部                              │
│ ○ 阿姆哈拉语 (am)                 │
│ ○ 阿拉伯语 (ar)                   │
│ ...                              │
├──────────────────────────────────┤
│ ＋ 添加自定义语言 "xx-YY"          │  ← only when no match
└──────────────────────────────────┘
```

### Interaction rules

| Action | Behavior |
|---|---|
| Click unselected language | Add to current languages, row becomes ✓ greyed |
| Click selected language (greyed row) | Remove from current languages, row becomes active |
| Click ✕ on top Badge | Same as above — remove language |
| Search input | cmdk fuzzy filter, matches both code and Chinese name |
| No match found | Show "Add custom language" option at bottom, click opens inline label input |
| `en` row | Always ✓ greyed and **not clickable** (en is required base language) |
| Search active | Flatten groups, show results by match relevance |

### Common languages group

~10 high-frequency languages at top: en, zh-CN, zh-TW, ja, ko, fr, de, es, pt, ru

### Custom language flow

When input doesn't match any built-in language, a "＋ Add custom language" item appears. Clicking it reveals an inline input for the Chinese label (备注), then adds the language.

## Non-goals

- Changing the save flow (still requires clicking "保存语种设置")
- Modifying the server API
- Changing the project creation language selector (LanguageSelector.tsx) — that's a separate component

## Scope

- `packages/web/components/views/projectView/ProjectSettingTab.tsx` — rewrite the `languages` TabsContent section
- Possibly extract a reusable `LanguageCommandList` component
