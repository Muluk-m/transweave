# qlj-i18n

Self-hosted internationalization management platform.

- Multi-language translation management with modules and namespaces
- Team collaboration with role-based access control (owner / manager / member)
- AI-assisted translation via OpenAI, Claude, DeepL, or Google Translate (optional, bring your own API key)
- Import and export in JSON, YAML, CSV, XLIFF, and Gettext (.po) formats
- CLI tool for CI/CD integration (`qlj-i18n pull` / `qlj-i18n push`)
- MCP server for AI coding assistants
- PGlite support for zero-config local development (no PostgreSQL install needed)

**Tech stack:** Next.js, NestJS, PostgreSQL / PGlite, Drizzle ORM, pnpm monorepo

## Quick Start with Docker

```bash
# 1. Clone the repository
git clone https://github.com/your-org/qlj-i18n.git
cd qlj-i18n

# 2. Configure environment
cp .env.example .env
# Edit .env: set POSTGRES_PASSWORD and JWT_SECRET (both required)
# Generate a JWT secret:
openssl rand -base64 64

# 3. Start the platform
docker compose up -d
# Open http://localhost:3000
# On first launch, a setup wizard creates your admin account
```

## Quick Start without Docker (PGlite)

No PostgreSQL installation needed. PGlite runs an embedded database automatically when `DATABASE_URL` is not set.

```bash
# 1. Clone and install
git clone https://github.com/your-org/qlj-i18n.git
cd qlj-i18n
pnpm install

# 2. Configure environment
cp .env.example packages/server/.env
# Edit packages/server/.env:
#   - Set JWT_SECRET (required). Generate with: openssl rand -base64 64
#   - Do NOT set DATABASE_URL -- PGlite will be used automatically

# 3. Start the backend
pnpm dev:server

# 4. Start the frontend (in a new terminal)
pnpm dev:web
# Open http://localhost:3000
```

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
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:3001` | Backend API URL as seen from the browser. **Build-time** -- changing this requires rebuilding the web Docker image. |
| `NEXT_INTERNAL_API_URL` | No | `http://server:3001` | Backend API URL for server-side rendering inside Docker network. |
| `WEB_PORT` | No | `3000` | Host port for the web UI (Docker Compose only). |
| `AI_PROVIDER` | No | -- | AI translation provider: `openai`, `claude`, `deepl`, or `google`. Leave empty to disable. |
| `AI_API_KEY` | No | -- | API key for the configured AI provider. |
| `PGLITE_DATA_DIR` | No | `./data/pglite` | PGlite data directory (used when `DATABASE_URL` is not set). |

> **Note:** `NEXT_PUBLIC_*` variables are baked into the frontend JavaScript bundle at build time. Changing them after the build has no effect. In Docker, rebuild the web image: `docker compose build web`.

## Architecture

```
qlj-i18n/
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
pnpm --filter server test
```

**Drizzle Studio** (database browser):

```bash
pnpm --filter server drizzle-kit studio
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

**Server won't start**
Check that `POSTGRES_PASSWORD` and `JWT_SECRET` are set in your `.env` file. Both are required.

**Frontend shows wrong API URL**
`NEXT_PUBLIC_API_URL` is a build-time variable. Rebuild the web image after changing it:
```bash
docker compose build web && docker compose up -d web
```

**Data lost after restart**
Make sure you are using `docker compose down` (not `docker compose down -v`). The `-v` flag removes named volumes and all data with them.

**Port already in use**
Change `WEB_PORT` in your `.env` file to an available port (e.g., `WEB_PORT=8080`).

**PGlite errors in local development**
Delete the PGlite data directory and restart:
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
