<p align="center">
  <img src="packages/web/public/logo.svg" alt="Transweave" width="80" height="80" />
</p>

<h1 align="center">Transweave</h1>

<p align="center">
  Self-hosted i18n management for teams that ship.<br/>
  <a href="./README.md">中文</a>
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

## Features

- **Multi-language translation management** — organize with modules and namespaces
- **Team collaboration** — role-based access control (owner / manager / member)
- **AI-assisted translation** — OpenAI, Claude, DeepL, or Google Translate (bring your own API key)
- **Import & export** — JSON, YAML, CSV, XLIFF, Gettext (.po)
- **CLI tool** — `transweave pull` / `transweave push` for CI/CD integration
- **MCP server** — for AI coding assistants
- **Zero-config local dev** — PGlite embedded database, no PostgreSQL install needed

**Tech stack:** Next.js 15 &middot; NestJS 11 &middot; PostgreSQL / PGlite &middot; Drizzle ORM &middot; pnpm monorepo

## Quick Start

### Docker (recommended)

No need to clone the repo — just pull the official images:

```bash
# Download compose file and env template
curl -O https://raw.githubusercontent.com/Muluk-m/transweave/master/docker-compose.yml
curl -O https://raw.githubusercontent.com/Muluk-m/transweave/master/.env.example

cp .env.example .env
# Edit .env and set:
#   POSTGRES_PASSWORD=<strong password>
#   JWT_SECRET=$(openssl rand -base64 64)

docker compose up -d
```

> **Image registries**
>
> | Registry | Address |
> |----------|---------|
> | Docker Hub | `mulukma/transweave-server` · `mulukma/transweave-web` |
> | GHCR | `ghcr.io/muluk-m/transweave-server` · `ghcr.io/muluk-m/transweave-web` |
>
> Docker Hub is used by default. To use GHCR, replace the image addresses in `docker-compose.yml`.
> Pin a specific version by replacing `:latest` with e.g. `:1.2.3`.

### Build from Source (developers)

```bash
git clone https://github.com/Muluk-m/transweave.git
cd transweave

cp .env.example .env
# Edit .env and set POSTGRES_PASSWORD and JWT_SECRET

docker compose -f docker-compose.dev.yml up -d
```

### Local Development (PGlite)

No PostgreSQL needed. PGlite runs automatically when `DATABASE_URL` is not set.

```bash
git clone https://github.com/Muluk-m/transweave.git
cd transweave
pnpm install

cp .env.example packages/server/.env
# Edit packages/server/.env and set JWT_SECRET

pnpm dev:server   # start backend
pnpm dev:web      # new terminal, start frontend
```

Open http://localhost:3000. On first launch, the app redirects to `/setup` to create your admin account and team.

## Environment Variables

All variables are defined in `.env.example`.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Docker: yes / Local: no | — | PostgreSQL connection string. Omit for PGlite. |
| `JWT_SECRET` | Yes | — | JWT signing secret. Generate with `openssl rand -base64 64`. |
| `POSTGRES_PASSWORD` | Docker: yes | — | PostgreSQL password (Docker only). |
| `POSTGRES_DB` | No | `i18n` | Database name (Docker only). |
| `POSTGRES_USER` | No | `i18n` | Database user (Docker only). |
| `PORT` | No | `3001` | Backend API port. |
| `WEB_PORT` | No | `3000` | Frontend port (Docker only). |
| `UPLOAD_DIR` | No | `./uploads` | Upload directory. |
| `NEXT_INTERNAL_API_URL` | No | `http://server:3001` | Backend URL for SSR inside Docker network. |
| `AI_PROVIDER` | No | — | AI translation: `openai` / `claude` / `deepl` / `google`. |
| `AI_API_KEY` | No | — | API key for the AI provider. |
| `PGLITE_DATA_DIR` | No | `./data/pglite` | PGlite data directory. |

## Architecture

```
transweave/
  packages/
    server/     NestJS API — auth, teams, translations, AI, file storage
    web/        Next.js frontend
    cli/        CLI tool — pull / push
```

- **Database** — PostgreSQL in production, PGlite for local dev (zero-config)
- **File storage** — local disk, persisted via Docker named volumes
- **Monorepo** — pnpm workspaces

## Development

**Prerequisites:** Node.js >= 22, pnpm >= 10.8

```bash
# Run E2E tests
pnpm --filter @transweave/server test:e2e

# Drizzle Studio (database browser)
pnpm --filter @transweave/server drizzle-kit studio
```

## Docker Details

### Services

| Service | Description | Port |
|---------|-------------|------|
| `postgres` | PostgreSQL 17 Alpine | Internal only |
| `server` | NestJS API | Internal only |
| `web` | Next.js frontend | `${WEB_PORT:-3000}:3000` |

### Volumes

| Volume | Path | Purpose |
|--------|------|---------|
| `pgdata` | `/var/lib/postgresql/data` | Database data |
| `uploads` | `/app/uploads` | Uploaded files |

### Common Commands

```bash
docker compose up -d                             # start (pull images)
docker compose pull && docker compose up -d      # update to latest
docker compose logs -f server                    # view logs
docker compose down                              # stop (keep data)
docker compose down -v                           # reset all data

# Build from source (developers)
docker compose -f docker-compose.dev.yml build && docker compose -f docker-compose.dev.yml up -d
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Can't log in | First install requires visiting `/setup` to create admin. Go to http://localhost:3000/setup if not redirected. |
| Server won't start | Ensure `JWT_SECRET` is set. Docker also requires `POSTGRES_PASSWORD`. |
| Data lost after Docker restart | Use `docker compose down` without `-v`. |
| Data lost after PGlite restart | Check `PGLITE_DATA_DIR` points to a stable path. |
| Port in use | Change `WEB_PORT` (Docker) or `PORT` (local). |
| PGlite errors | `rm -rf data/pglite && pnpm dev:server` to reset. |

## Contributing

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git commit -m "feat: add new export format"
```

## License

MIT
