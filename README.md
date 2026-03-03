# Transweave

[中文](#中文) | [English](#english)

---

## 中文

自托管国际化管理平台。

- 多语言翻译管理，支持模块和命名空间
- 团队协作，基于角色的访问控制（所有者 / 管理员 / 成员）
- AI 辅助翻译，支持 OpenAI、Claude、DeepL 或 Google Translate（可选，自带 API key）
- 导入导出支持 JSON、YAML、CSV、XLIFF 和 Gettext（.po）格式
- CLI 工具用于 CI/CD 集成（`transweave pull` / `transweave push`）
- MCP 服务，供 AI 编程助手调用
- PGlite 支持零配置本地开发（无需安装 PostgreSQL）

**技术栈：** Next.js、NestJS、PostgreSQL / PGlite、Drizzle ORM、pnpm monorepo

### Docker 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/your-org/transweave.git
cd transweave

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，设置以下两个必填项：
#   POSTGRES_PASSWORD=<强密码>
#   JWT_SECRET=$(openssl rand -base64 64)

# 3. 启动平台
docker compose up -d
```

打开 http://localhost:3000。首次启动时，应用会自动跳转到 `/setup` 页面，在那里创建管理员账号和第一个团队。完成后即可正常登录。

### 本地开发快速开始（PGlite）

无需安装 PostgreSQL。当 `DATABASE_URL` 未设置时，PGlite 会自动运行嵌入式数据库，数据写入磁盘，重启后不丢失。

```bash
# 1. 克隆并安装依赖
git clone https://github.com/your-org/transweave.git
cd transweave
pnpm install

# 2. 配置环境变量（JWT_SECRET 是唯一必填项）
cp .env.example packages/server/.env
# 编辑 packages/server/.env，设置：
#   JWT_SECRET=$(openssl rand -base64 64)
# 保持 DATABASE_URL 注释状态 —— PGlite 会自动使用。

# 3. 启动后端
pnpm dev:server

# 4. 启动前端（新终端）
pnpm dev:web
```

打开 http://localhost:3000。首次启动时，应用会自动跳转到 `/setup` 页面，在那里创建管理员账号和第一个团队。完成后即可正常登录。

### 环境变量

所有变量在 `.env.example` 中定义。复制后按需编辑。

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `DATABASE_URL` | Docker: 是，本地: 否 | -- | PostgreSQL 连接字符串。留空则使用 PGlite。 |
| `POSTGRES_DB` | 否 | `i18n` | PostgreSQL 数据库名（仅 Docker Compose）。 |
| `POSTGRES_USER` | 否 | `i18n` | PostgreSQL 用户名（仅 Docker Compose）。 |
| `POSTGRES_PASSWORD` | Docker: 是 | -- | PostgreSQL 密码（仅 Docker Compose）。 |
| `JWT_SECRET` | 是 | -- | JWT Token 签名密钥。用 `openssl rand -base64 64` 生成。 |
| `PORT` | 否 | `3001` | 后端 API 监听端口。 |
| `UPLOAD_DIR` | 否 | `./uploads` | 上传文件存储目录（截图等）。 |
| `NEXT_PUBLIC_API_URL` | 否 | `http://localhost:3001` | 浏览器访问的后端 API 地址。**构建时变量** —— 修改后需重新构建 web 镜像。 |
| `NEXT_INTERNAL_API_URL` | 否 | `http://server:3001` | Docker 网络内部服务端渲染使用的后端地址。 |
| `WEB_PORT` | 否 | `3000` | Web UI 对外暴露的端口（仅 Docker Compose）。 |
| `AI_PROVIDER` | 否 | -- | AI 翻译服务商：`openai`、`claude`、`deepl` 或 `google`。留空则禁用。 |
| `AI_API_KEY` | 否 | -- | 对应 AI 服务商的 API key。 |
| `PGLITE_DATA_DIR` | 否 | `./data/pglite` | PGlite 数据目录（`DATABASE_URL` 未设置时生效）。 |

> **注意：** `NEXT_PUBLIC_*` 变量在构建时嵌入前端 JavaScript bundle，修改后不会生效。Docker 下需重新构建：`docker compose build web`。

### 架构

```
transweave/
  packages/
    server/     NestJS API（认证、团队、翻译、AI、文件存储）
    web/        Next.js 前端
    cli/        CI/CD 集成 CLI 工具
```

- **数据库：** 生产环境使用 PostgreSQL（Docker），本地开发使用 PGlite（零配置）。
- **文件存储：** 本地磁盘。Docker 下通过 named volume 持久化。
- **Monorepo：** 使用 pnpm workspaces 管理。

### 开发

**前置条件：**

- Node.js >= 22
- pnpm >= 10.8.0

**运行测试：**

```bash
pnpm --filter server test
```

**Drizzle Studio**（数据库浏览器）：

```bash
pnpm --filter server drizzle-kit studio
```

### Docker 详情

#### 服务

| 服务 | 镜像 / 构建 | 端口 | 说明 |
|------|------------|------|------|
| `postgres` | `postgres:17-alpine` | 仅内部 | PostgreSQL 数据库，含健康检查 |
| `server` | `packages/server/Dockerfile` | 仅内部 | NestJS API 服务 |
| `web` | `packages/web/Dockerfile` | `${WEB_PORT:-3000}:3000` | Next.js 前端 |

#### 数据卷

| 卷名 | 容器路径 | 用途 |
|------|---------|------|
| `pgdata` | `/var/lib/postgresql/data` | PostgreSQL 数据（重启后保留） |
| `uploads` | `/app/uploads` | 上传文件（截图等） |

#### 常用命令

```bash
# 代码变更后重新构建
docker compose build && docker compose up -d

# 查看服务端日志
docker compose logs -f server

# 停止（数据保留在 volume 中）
docker compose down

# 重置所有数据（警告：删除数据库和上传文件）
docker compose down -v
```

### 故障排除

**无法登录 / 登录页不接受账号密码**
全新安装时数据库中没有任何用户。应用打开时会自动跳转到 `/setup` 页面。如果未自动跳转，请直接访问 http://localhost:3000/setup，创建管理员账号和第一个团队。

**服务端无法启动**
所有配置下 `JWT_SECRET` 都是必填项。Docker 还额外需要 `POSTGRES_PASSWORD`。请检查 `.env`（Docker）或 `packages/server/.env`（本地）是否都已设置。

**前端 API 地址不对**
`NEXT_PUBLIC_API_URL` 是构建时变量，修改后需重新构建 web 镜像：
```bash
docker compose build web && docker compose up -d web
```

**重启后数据丢失（Docker）**
请使用 `docker compose down`，而非 `docker compose down -v`。`-v` 参数会删除 named volume 及其中的所有数据。

**重启后数据丢失（本地 PGlite）**
检查 `packages/server/.env` 中 `PGLITE_DATA_DIR` 是否指向固定路径（默认：`./data/pglite`）。如未设置该变量，数据存储在服务端启动目录下的 `./data/pglite`。

**端口被占用**
修改 `.env` 中的 `WEB_PORT`（Docker）或 `PORT`（本地）为可用端口。

**本地开发 PGlite 报错**
删除 PGlite 数据目录后重启（此操作会重置所有数据）：
```bash
rm -rf data/pglite
pnpm dev:server
```

### 贡献

本项目使用 [Conventional Commits](https://www.conventionalcommits.org/)。提交信息请以 `feat:`、`fix:`、`docs:`、`chore:` 等前缀开头。

```bash
git commit -m "feat: add new export format"
```

### License

MIT

---

## English

Self-hosted internationalization management platform.

- Multi-language translation management with modules and namespaces
- Team collaboration with role-based access control (owner / manager / member)
- AI-assisted translation via OpenAI, Claude, DeepL, or Google Translate (optional, bring your own API key)
- Import and export in JSON, YAML, CSV, XLIFF, and Gettext (.po) formats
- CLI tool for CI/CD integration (`transweave pull` / `transweave push`)
- MCP server for AI coding assistants
- PGlite support for zero-config local development (no PostgreSQL install needed)

**Tech stack:** Next.js, NestJS, PostgreSQL / PGlite, Drizzle ORM, pnpm monorepo

### Quick Start with Docker

```bash
# 1. Clone the repository
git clone https://github.com/your-org/transweave.git
cd transweave

# 2. Configure environment
cp .env.example .env
# Edit .env and set the two required values:
#   POSTGRES_PASSWORD=<strong password>
#   JWT_SECRET=$(openssl rand -base64 64)

# 3. Start the platform
docker compose up -d
```

Open http://localhost:3000. On the first launch the app redirects automatically to `/setup` where you create your admin account and first team. After that you can log in normally.

### Quick Start without Docker (PGlite)

No PostgreSQL installation needed. PGlite runs an embedded database automatically when `DATABASE_URL` is not set. Data is stored on disk and persists across restarts.

```bash
# 1. Clone and install
git clone https://github.com/your-org/transweave.git
cd transweave
pnpm install

# 2. Configure environment (JWT_SECRET is the only required variable)
cp .env.example packages/server/.env
# Open packages/server/.env and set:
#   JWT_SECRET=$(openssl rand -base64 64)
# Leave DATABASE_URL commented out — PGlite is used automatically.

# 3. Start the backend
pnpm dev:server

# 4. Start the frontend (in a new terminal)
pnpm dev:web
```

Open http://localhost:3000. On the first launch the app redirects automatically to `/setup` where you create your admin account and first team. After that you can log in normally.

### Environment Variables

All variables are defined in `.env.example`. Copy it and edit as needed.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Docker: yes, Local: no | -- | PostgreSQL connection string. Omit for PGlite. |
| `POSTGRES_DB` | No | `i18n` | PostgreSQL database name (Docker Compose only). |
| `POSTGRES_USER` | No | `i18n` | PostgreSQL user (Docker Compose only). |
| `POSTGRES_PASSWORD` | Docker: yes | -- | PostgreSQL password (Docker Compose only). |
| `JWT_SECRET` | Yes | -- | Secret for signing JWT tokens. Generate with `openssl rand -base64 64`. |
| `PORT` | No | `3001` | Port the backend API listens on. |
| `UPLOAD_DIR` | No | `./uploads` | Directory for uploaded files (screenshots, etc.). |
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:3001` | Backend API URL as seen from the browser. **Build-time** -- changing this requires rebuilding the web Docker image. |
| `NEXT_INTERNAL_API_URL` | No | `http://server:3001` | Backend API URL for server-side rendering inside Docker network. |
| `WEB_PORT` | No | `3000` | Host port for the web UI (Docker Compose only). |
| `AI_PROVIDER` | No | -- | AI translation provider: `openai`, `claude`, `deepl`, or `google`. Leave empty to disable. |
| `AI_API_KEY` | No | -- | API key for the configured AI provider. |
| `PGLITE_DATA_DIR` | No | `./data/pglite` | PGlite data directory (used when `DATABASE_URL` is not set). |

> **Note:** `NEXT_PUBLIC_*` variables are baked into the frontend JavaScript bundle at build time. Changing them after the build has no effect. In Docker, rebuild the web image: `docker compose build web`.

### Architecture

```
transweave/
  packages/
    server/     NestJS API (authentication, teams, translations, AI, file storage)
    web/        Next.js frontend
    cli/        CLI tool for pull/push operations
```

- **Database:** PostgreSQL in production (Docker) or PGlite for local development (zero-config).
- **File storage:** Local disk. In Docker, persisted via a named volume.
- **Monorepo:** Managed with pnpm workspaces.

### Development

**Prerequisites:**

- Node.js >= 22
- pnpm >= 10.8.0

**Run tests:**

```bash
pnpm --filter server test
```

**Drizzle Studio** (database browser):

```bash
pnpm --filter server drizzle-kit studio
```

### Docker Details

#### Services

| Service | Image / Build | Port | Description |
|---------|---------------|------|-------------|
| `postgres` | `postgres:17-alpine` | Internal only | PostgreSQL database with health check |
| `server` | `packages/server/Dockerfile` | Internal only | NestJS API server |
| `web` | `packages/web/Dockerfile` | `${WEB_PORT:-3000}:3000` | Next.js frontend |

#### Volumes

| Volume | Container path | Purpose |
|--------|---------------|---------|
| `pgdata` | `/var/lib/postgresql/data` | PostgreSQL data (persists across restarts) |
| `uploads` | `/app/uploads` | Uploaded files (screenshots, etc.) |

#### Common commands

```bash
# Rebuild after code changes
docker compose build && docker compose up -d

# View server logs
docker compose logs -f server

# Stop (data is preserved in volumes)
docker compose down

# Reset all data (WARNING: deletes database and uploads)
docker compose down -v
```

### Troubleshooting

**Can't log in / login page won't accept credentials**
On a fresh install there are no user accounts yet. The app should redirect you to `/setup` automatically when you open it. If the redirect doesn't happen, navigate to http://localhost:3000/setup directly to create your admin account and first team.

**Server won't start**
`JWT_SECRET` is required in all configurations. For Docker, `POSTGRES_PASSWORD` is also required. Check your `.env` (Docker) or `packages/server/.env` (local) and make sure both are set.

**Frontend shows wrong API URL**
`NEXT_PUBLIC_API_URL` is a build-time variable. Rebuild the web image after changing it:
```bash
docker compose build web && docker compose up -d web
```

**Data lost after restart (Docker)**
Make sure you are using `docker compose down` (not `docker compose down -v`). The `-v` flag removes named volumes and all data with them.

**Data lost after restart (local PGlite)**
Check that `PGLITE_DATA_DIR` in `packages/server/.env` points to a stable path (default: `./data/pglite`). If the variable is unset, data is stored in `./data/pglite` relative to where the server is started.

**Port already in use**
Change `WEB_PORT` (Docker) or `PORT` (local) in your `.env` file to an available port.

**PGlite errors in local development**
Delete the PGlite data directory and restart (this resets all data):
```bash
rm -rf data/pglite
pnpm dev:server
```

### Contributing

This project uses [Conventional Commits](https://www.conventionalcommits.org/). Prefix your commit messages with `feat:`, `fix:`, `docs:`, `chore:`, etc.

```bash
git commit -m "feat: add new export format"
```

### License

MIT
