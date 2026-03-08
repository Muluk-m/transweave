<p align="center">
  <img src="packages/web/public/logo.svg" alt="Transweave" width="80" height="80" />
</p>

<h1 align="center">Transweave</h1>

<p align="center">
  自托管国际化管理平台<br/>
  <a href="./README.en.md">English</a>
</p>

<p align="center">
  <a href="https://render.com/deploy?repo=https://github.com/Muluk-m/transweave">
    <img src="https://render.com/images/deploy-to-render-button.svg" alt="Deploy to Render" />
  </a>
</p>

<p align="center">
  <img src="packages/web/public/screenshots/hero-preview.png" alt="Transweave Screenshot" width="100%" style="border-radius: 8px;" />
</p>

---

## 特性

- **多语言翻译管理** — 支持模块和命名空间组织翻译条目
- **团队协作** — 基于角色的访问控制（所有者 / 管理员 / 成员）
- **AI 辅助翻译** — 支持 OpenAI、Claude、DeepL、Google Translate（自带 API Key）
- **丰富的导入导出** — JSON、YAML、CSV、XLIFF、Gettext (.po)
- **CLI 工具** — `transweave pull` / `transweave push`，轻松接入 CI/CD
- **MCP 服务** — 供 AI 编程助手直接调用
- **零配置本地开发** — PGlite 嵌入式数据库，无需安装 PostgreSQL

**技术栈：** Next.js 15 &middot; NestJS 11 &middot; PostgreSQL / PGlite &middot; Drizzle ORM &middot; pnpm monorepo

## 快速开始

### Docker（推荐）

```bash
git clone https://github.com/Muluk-m/transweave.git
cd transweave

cp .env.example .env
# 编辑 .env，设置：
#   POSTGRES_PASSWORD=<强密码>
#   JWT_SECRET=$(openssl rand -base64 64)

docker compose up -d
```

### 本地开发（PGlite）

无需安装 PostgreSQL，`DATABASE_URL` 未设置时自动使用 PGlite 嵌入式数据库。

```bash
git clone https://github.com/Muluk-m/transweave.git
cd transweave
pnpm install

cp .env.example packages/server/.env
# 编辑 packages/server/.env，设置 JWT_SECRET

pnpm dev:server   # 启动后端
pnpm dev:web      # 新终端，启动前端
```

打开 http://localhost:3000 ，首次启动会自动跳转到 `/setup` 页面创建管理员账号和团队。

## 环境变量

所有变量在 `.env.example` 中定义。

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `DATABASE_URL` | Docker: 是 / 本地: 否 | — | PostgreSQL 连接字符串，留空使用 PGlite |
| `JWT_SECRET` | 是 | — | JWT 签名密钥，`openssl rand -base64 64` 生成 |
| `POSTGRES_PASSWORD` | Docker: 是 | — | PostgreSQL 密码（仅 Docker） |
| `POSTGRES_DB` | 否 | `i18n` | 数据库名（仅 Docker） |
| `POSTGRES_USER` | 否 | `i18n` | 数据库用户（仅 Docker） |
| `PORT` | 否 | `3001` | 后端 API 端口 |
| `WEB_PORT` | 否 | `3000` | 前端端口（仅 Docker） |
| `UPLOAD_DIR` | 否 | `./uploads` | 文件上传目录 |
| `NEXT_INTERNAL_API_URL` | 否 | `http://server:3001` | Docker 内部 SSR 后端地址 |
| `AI_PROVIDER` | 否 | — | AI 翻译：`openai` / `claude` / `deepl` / `google` |
| `AI_API_KEY` | 否 | — | AI 服务商 API Key |
| `PGLITE_DATA_DIR` | 否 | `./data/pglite` | PGlite 数据目录 |

## 项目结构

```
transweave/
  packages/
    server/     NestJS API — 认证、团队、翻译、AI、文件存储
    web/        Next.js 前端
    cli/        CLI 工具 — pull / push
```

- **数据库** — 生产用 PostgreSQL，本地开发用 PGlite（零配置）
- **文件存储** — 本地磁盘，Docker 通过 named volume 持久化
- **Monorepo** — pnpm workspaces

## 开发

**前置条件：** Node.js >= 22、pnpm >= 10.8

```bash
# 运行 E2E 测试
pnpm --filter @transweave/server test:e2e

# Drizzle Studio（数据库浏览器）
pnpm --filter @transweave/server drizzle-kit studio
```

## Docker 详情

### 服务

| 服务 | 说明 | 端口 |
|------|------|------|
| `postgres` | PostgreSQL 17 Alpine | 仅内部 |
| `server` | NestJS API | 仅内部 |
| `web` | Next.js 前端 | `${WEB_PORT:-3000}:3000` |

### 数据卷

| 卷名 | 路径 | 用途 |
|------|------|------|
| `pgdata` | `/var/lib/postgresql/data` | 数据库数据 |
| `uploads` | `/app/uploads` | 上传文件 |

### 常用命令

```bash
docker compose build && docker compose up -d   # 重新构建
docker compose logs -f server                   # 查看日志
docker compose down                             # 停止（保留数据）
docker compose down -v                          # 重置所有数据
```

## 故障排除

| 问题 | 解决方案 |
|------|---------|
| 无法登录 | 首次安装需访问 `/setup` 创建管理员，未自动跳转时手动访问 http://localhost:3000/setup |
| 服务端无法启动 | 检查 `JWT_SECRET` 是否设置；Docker 还需 `POSTGRES_PASSWORD` |
| Docker 重启后数据丢失 | 使用 `docker compose down`，不要加 `-v` |
| PGlite 重启后数据丢失 | 检查 `PGLITE_DATA_DIR` 是否指向固定路径 |
| 端口占用 | 修改 `WEB_PORT`（Docker）或 `PORT`（本地） |
| PGlite 报错 | `rm -rf data/pglite && pnpm dev:server` 重置数据 |

## 贡献

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```bash
git commit -m "feat: add new export format"
```

## License

MIT
