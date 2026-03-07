## 1. Component Creation

- [x] 1.1 Create `LanguageCommandList` component with cmdk inline Command list, two groups (常用 + 全部), check/muted styling for selected languages, and `en` always disabled
- [x] 1.2 Add search support matching both language code and Chinese name via cmdk keywords
- [x] 1.3 Add custom language fallback: show "＋ 添加自定义语言" when no match, inline label input on click

## 2. Integration

- [x] 2.1 Replace the three-section layout in `ProjectSettingTab.tsx` languages tab with current badges + `LanguageCommandList`
- [x] 2.2 Add i18n keys for new UI text (search placeholder, custom language prompts, group labels)
