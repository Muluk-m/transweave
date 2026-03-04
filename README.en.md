# Transweave

[中文](./README.md)

Self-hosted internationalization management platform.

- Multi-language translation management with modules and namespaces
- Team collaboration with role-based access control (owner / manager / member)
- AI-assisted translation via OpenAI, Claude, DeepL, or Google Translate (optional, bring your own API key)
- Import and export in JSON, YAML, CSV, XLIFF, and Gettext (.po) formats
- CLI tool for CI/CD integration (`transweave pull` / `transweave push`)
- MCP server for AI coding assistants
- PGlite support for zero-config local development (no PostgreSQL install needed)

**Tech stack:** Next.js, NestJS, PostgreSQL / PGlite, Drizzle ORM, pnpm monorepo

## Quick Start with Docker

```bash
# 1. Clone the repository
git clone https://github.com/Muluk-m/transweave.git
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

## Quick Start without Docker (PGlite)

No PostgreSQL installation needed. PGlite runs an embedded database automatically when `DATABASE_URL` is not set. Data is stored on disk and persists across restarts.

```bash
# 1. Clone and install
git clone https://github.com/Muluk-m/transweave.git
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

## Environment Variables

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
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:3001` | Backend API URL as seen from the browser. **Build-time** — changing this requires rebuilding the web Docker image. |
| `NEXT_INTERNAL_API_URL` | No | `http://server:3001` | Backend API URL for server-side rendering inside the Docker network. |
| `WEB_PORT` | No | `3000` | Host port for the web UI (Docker Compose only). |
| `AI_PROVIDER` | No | -- | AI translation provider: `openai`, `claude`, `deepl`, or `google`. Leave empty to disable. |
| `AI_API_KEY` | No | -- | API key for the configured AI provider. |
| `PGLITE_DATA_DIR` | No | `./data/pglite` | PGlite data directory (used when `DATABASE_URL` is not set). |

> **Note:** `NEXT_PUBLIC_*` variables are baked into the frontend JavaScript bundle at build time. Changing them after the build has no effect. In Docker, rebuild the web image: `docker compose build web`.

## Architecture

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

## Development

**Prerequisites:**

- Node.js >= 22
- pnpm >= 10.8.0

**Run tests:**

```bash
pnpm --filter @transweave/server test:e2e
```

**Drizzle Studio** (database browser):

```bash
pnpm --filter @transweave/server drizzle-kit studio
```

## Docker Details

### Services

| Service | Image / Build | Port | Description |
|---------|---------------|------|-------------|
| `postgres` | `postgres:17-alpine` | Internal only | PostgreSQL database with health check |
| `server` | `packages/server/Dockerfile` | Internal only | NestJS API server |
| `web` | `packages/web/Dockerfile` | `${WEB_PORT:-3000}:3000` | Next.js frontend |

### Volumes

| Volume | Container path | Purpose |
|--------|---------------|---------|
| `pgdata` | `/var/lib/postgresql/data` | PostgreSQL data (persists across restarts) |
| `uploads` | `/app/uploads` | Uploaded files (screenshots, etc.) |

### Common commands

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

## Troubleshooting

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

## Contributing

This project uses [Conventional Commits](https://www.conventionalcommits.org/). Prefix your commit messages with `feat:`, `fix:`, `docs:`, `chore:`, etc.

```bash
git commit -m "feat: add new export format"
```

## License

MIT
