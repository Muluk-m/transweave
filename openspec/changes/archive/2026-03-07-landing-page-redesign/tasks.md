# Implementation Tasks

## 1. i18n 文案重写
- [x] 1.1 重写 `welcome` 区块 — 标语、描述、CTA 按钮文案
- [x] 1.2 重写 `features` 区块 — 重排特性，AI 翻译放首位，新增 CLI/API/MCP
- [x] 1.3 重写 `workflow` → `quickstart` 区块 — docker → 创建团队 → 接入 CLI
- [x] 1.4 删除 `cases` 区块文案，替换为 `integrations` 集成生态文案
- [x] 1.5 重写 `cta` 区块 — 去掉付费暗示，加 MIT License 标注
- [x] 1.6 同步修改 zh-CN.json 和 en-US.json（含 messages/ 子目录）

## 2. welcomeView.tsx 结构重写
- [x] 2.1 Hero 区：加 docker 命令框（带复制按钮），替换统计数据
- [x] 2.2 Hero 区：CTA 改为 [GitHub] [在线 Demo] [文档]
- [x] 2.3 Features 区：重排卡片，AI 翻译 + 集成能力提前
- [x] 2.4 Workflow → Quick Start：3 步部署流程
- [x] 2.5 Cases → Integrations：CLI/API/MCP 集成展示 + 代码示例
- [x] 2.6 CTA 区：简化，GitHub + Demo，MIT License 标注

## 3. Header 改动
- [x] 3.1 Header 加 GitHub icon 链接（指向 github.com/Muluk-m/transweave）— 已存在

## 4. 验证
- [x] 4.1 中英文切换正常
- [x] 4.2 Demo 登录功能正常
- [x] 4.3 移动端响应式正常
- [x] 4.4 Dark theme 兼容
