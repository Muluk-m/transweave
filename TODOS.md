# TODOS

## P1

### 自动翻译流水线
git push → CI 触发 `transweave diff` → 检测新/改 key → AI 翻译 → 推回项目。需要 CLI `diff` 命令 + GitHub Action 模板。从"管理工具"到"开发工作流集成"的跳跃。
- **Effort:** L (human: ~1 week / CC: ~1-2h)
- **Depends on:** 批量翻译 API、CLI push/pull
- **Where to start:** 先实现 CLI `transweave diff` 命令（比较本地 JSON 文件与服务端 token），然后写 GitHub Action YAML 模板

## P2

### 快捷键系统
翻译编辑界面加快捷键：Tab 切换语言、Cmd+Enter 保存、Cmd+Shift+T AI 翻译。Power user 体验提升。
- **Effort:** S (human: ~1 day / CC: ~15 min)
- **Depends on:** 无
- **Where to start:** 在 TokenFormDrawer 或 TranslationFields 组件中添加 useHotkeys hook

### 创建 DESIGN.md
运行 `/design-consultation` 生成正式设计系统文档（颜色、字体、间距、组件模式）。当前设计决策分散在 CSS 变量和组件代码中。
- **Effort:** M (human: ~3 days / CC: ~30min)
- **Depends on:** 无
- **Where to start:** 运行 `/design-consultation`，它会分析现有 CSS 变量和组件模式，生成 DESIGN.md

## P3

### Agent 对话历史持久化
MVP 阶段 Agent 对话存前端 state，刷新后丢失。等 Agent 功能稳定后，加 DB 存储让用户能回看历史对话。
- **Effort:** S (human: ~1 day / CC: ~15min)
- **Depends on:** Agent 功能稳定 (Sprint 2b)
- **Where to start:** 新建 agent_sessions 和 agent_messages 表，Agent Service 在处理消息时持久化
