# Change: Landing Page 从 SaaS 营销风格改为开发者工具风格

## Why

当前首页的调性像一个商业 SaaS 产品在卖付费服务：虚构客户案例、"99.9% 可用性"、"24/7 技术支持"、"免费版可升级"。但 Transweave 是一个开源自托管项目，核心价值是数据主权、一键部署、AI 集成翻译。当前页面完全没有传达这些。

## What Changes

重写 `welcomeView.tsx` 和对应 i18n 文案（en-US.json / zh-CN.json），从 SaaS 营销风格转为开发者工具风格（参考 Supabase / Appwrite）。

### 删除
- 虚假统计数据（99.9% uptime / 24/7 support）
- 虚构客户案例（TechGlobal / CreativeStudio 整个 section）
- SaaS 话术（"免费版可升级"、"注册免费版"、"Schedule a Demo"）

### 新增
- Hero 区 `docker compose up -d` 命令框（可复制）
- Hero 标语改为强调 self-hosted + AI-powered
- AI 翻译能力展示（OpenAI / Claude / DeepL / Google Translate）
- CLI + API + MCP 集成生态展示（替代虚构案例 section）
- Header 加 GitHub icon 链接
- 底部标注 MIT License

### 修改
- "开始使用" → "GitHub"
- "免费试用" → "在线 Demo"（行为不变，文案更诚实）
- Features 重排：AI 翻译和集成能力提到前面
- Workflow section → Quick Start（docker → 创建团队 → 接入 CLI）
- CTA section 简化，去掉所有付费暗示

## Impact

- 修改文件:
  - `packages/web/components/views/welcomeView.tsx` — 结构重写
  - `packages/web/i18n/en-US.json` — welcome/features/workflow/cases/cta 全部重写
  - `packages/web/i18n/zh-CN.json` — 同上
  - `packages/web/i18n/messages/en-US.json` — 如有对应 key
  - `packages/web/i18n/messages/zh-CN.json` — 如有对应 key
- 无新增依赖
- 无后端改动
- 无破坏性变更（纯前端首页内容）

## Design Decisions

1. **GitHub star count 不显示数字** — 项目初期 star 少，显示数字反效果，用简单 icon
2. **AI provider 在 Hero 区提及** — "AI-powered translations with OpenAI, Claude, DeepL & more" 是强差异化卖点
3. **保留 Demo 登录功能** — 自动登录 demo 账号的行为很好，只改文案
4. **MIT License** — 底部标注
