## Context

The language management section in `ProjectSettingTab.tsx` (lines 271-366) currently has three UI sections: current language badges, a manual code+label input form, and a 47-item flat badge grid. This is a frontend-only refactor — no server API changes.

Existing components available:
- `cmdk` library + `Command*` components in `components/ui/command.tsx`
- `Popover` in `components/ui/popover.tsx`
- `Languages` enum (47 entries) in `constants/languages.ts`
- `formatLanguageDisplay`, `isBuiltInLanguage` in `constants/custom-languages.ts`

## Goals / Non-Goals

**Goals:**
- Replace badge grid + manual input with a single inline `cmdk` Command list
- Support search by code ("ja") and Chinese name ("日语")
- Show selected languages as checked/greyed in the list, toggleable
- Preserve custom language support (code + label input when no match)

**Non-Goals:**
- Changing the save flow (still batch save via "保存语种设置")
- Modifying the server API or data model
- Changing `LanguageSelector.tsx` (project creation — separate component)

## Decisions

**1. Inline Command list (not Popover)**
Use `<Command>` directly embedded in the card, not wrapped in a Popover. Keeps the full list visible without click-to-open.

**2. Two groups: 常用 + 全部**
Top group "常用" contains ~10 high-frequency languages: en, zh-CN, zh-TW, ja, ko, fr, de, es, pt, ru. Remaining sorted alphabetically in "全部". During search, groups flatten and results show by match relevance (cmdk default behavior).

**3. Selected state shown inline**
Selected languages render with a `Check` icon and muted styling. Clicking toggles selection. `en` is always checked and disabled (required base language).

**4. Custom language via CommandEmpty fallback**
When search input doesn't match any built-in language, show a "＋ 添加自定义语言" item. Clicking reveals inline label input. On confirm, adds to both `projectLanguages` and `projectLanguageLabels`.

**5. Extract component**
Extract the Command list into a `LanguageCommandList` component to keep `ProjectSettingTab.tsx` manageable. Props: `selectedLanguages`, `languageLabels`, `onToggle`, `onAddCustom`.

## Risks / Trade-offs

- [cmdk search only matches item text content] → Set `keywords` on CommandItem to include both code and label for matching
- [47 items may feel long even in a list] → Max height with scroll (`max-h-[300px]`), plus search makes this manageable
