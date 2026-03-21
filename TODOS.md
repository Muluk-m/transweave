# TODOS

## Completed

### ~~自动翻译流水线~~ ✅
CLI `transweave translate` 命令 + GitHub Action 模板。

### ~~快捷键系统~~ ✅
Cmd+Enter 保存、Cmd+Shift+T AI 翻译。

### ~~Agent 对话历史持久化~~ ✅
agent_sessions + agent_messages 表，Session CRUD API。

## P2

### 创建 DESIGN.md
运行 `/design-consultation` 生成正式设计系统文档（颜色、字体、间距、组件模式）。当前设计决策分散在 CSS 变量和组件代码中。
- **Effort:** M (human: ~3 days / CC: ~30min)
- **Depends on:** 无
- **Where to start:** 运行 `/design-consultation`，它会分析现有 CSS 变量和组件模式，生成 DESIGN.md
