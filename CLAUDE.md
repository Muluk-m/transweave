# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Transweave is a self-hosted i18n management platform. pnpm monorepo with three packages:

- **`packages/server`** — NestJS 11 API (authentication, teams, projects, translations, AI, MCP)
- **`packages/web`** — Next.js 15 frontend (React 19, TailwindCSS, Radix UI, Jotai)
- **`packages/cli`** — CLI tool (`transweave pull` / `transweave push`)

Database: PostgreSQL (production) or PGlite (local dev, auto-selected when `DATABASE_URL` is unset).

## Commands

### Development

```bash
pnpm install                    # Install all dependencies
pnpm dev:server                 # Start backend (NestJS watch mode, port 3001)
pnpm dev:web                    # Start frontend (Next.js dev, port 3000)
pnpm dev:cli                    # Run CLI in dev mode
```

### Build

```bash
pnpm build:server               # Build backend
pnpm build:web                  # Build frontend
pnpm build:cli                  # Build CLI
```

### Test

```bash
# Server tests (Jest, requires --experimental-vm-modules)
pnpm --filter @transweave/server test              # Unit tests
pnpm --filter @transweave/server test -- --testPathPattern=<pattern>  # Single test file
pnpm --filter @transweave/server test:e2e          # E2E tests (--runInBand)
pnpm --filter @transweave/server test:cov          # Coverage
```

### Lint & Format

```bash
pnpm --filter @transweave/server lint              # ESLint with --fix
pnpm --filter @transweave/server format            # Prettier
pnpm --filter @transweave/web lint                 # Next.js ESLint
```

### Database

```bash
pnpm --filter @transweave/server drizzle-kit studio    # Browse DB in GUI
# Migrations run automatically on server startup
```

### Docker

```bash
docker compose up -d                                   # Production (pre-built images)
docker compose -f docker-compose.dev.yml up -d         # Dev (builds from source)
```

## Architecture

### Backend (`packages/server/src/`)

NestJS with controller → service → repository pattern:

- **`controller/`** — Route handlers (auth, user, team, project, token, mcp, api-key, upload, seed)
- **`service/`** — Business logic layer
- **`repository/`** — Data access layer
- **`db/schema/`** — Drizzle ORM table definitions (users, teams, memberships, projects, tokens, api-keys, activity-logs, files)
- **`db/migrations/`** — Drizzle migrations
- **`ai/`** — AI translation providers (OpenAI, Claude, DeepL, Google, Gemini, Deepseek) with pluggable provider pattern via `provider-factory.ts`
- **`jwt/`** — Passport JWT strategy and guard
- **`dto/`** — Request/response DTOs with class-validator decorators
- **`health/`** — Health check endpoint

Auth: JWT with Passport.js (15-day expiry). Rate limiting: 100 req/60s via NestJS Throttler.

### Frontend (`packages/web/`)

Next.js App Router structure:

- **`app/`** — Pages (login, signup, setup, project, team, settings, profile)
- **`api/`** — Client-side API layer (axios wrappers calling backend)
- **`components/ui/`** — shadcn/ui components (Radix UI primitives)
- **`components/views/`** — Page-level view components
- **`i18n/`** — Translations: `zh-CN.json` (default), `en-US.json`. Library: `next-intl`
- **`jotai/`** — Global state atoms
- **`middleware.ts`** — Proxies `/api/*` requests to the backend

First visit redirects to `/setup` for admin account creation.

### CLI (`packages/cli/src/`)

Commander-based CLI: `init`, `login`, `pull`, `push` commands for syncing translations with the server.

## Conventions

- **Commits**: Conventional Commits — `type(scope): description` (e.g., `feat(web):`, `fix(server):`, `refine(web):`)
- **i18n**: Both zh-CN and en-US translations must be updated together. Run `pnpm --filter @transweave/web i18n` to manage translation keys.
- **Environment**: Copy `.env.example` to `packages/server/.env` for local dev. `JWT_SECRET` is required.
- **Package manager**: pnpm 10.8+ with workspaces. Use `pnpm --filter <package>` to target packages.

## Key Technical Details

- PGlite is used for zero-config local dev — no PostgreSQL install needed
- The web `middleware.ts` acts as an API proxy, so frontend and backend can run on different ports without CORS issues in the browser
- AI providers share a common interface (`translation-provider.interface.ts`) with a factory pattern
- MCP (Model Context Protocol) server is built-in for AI assistant integration
- Export formats: JSON, YAML, CSV, XLIFF, Gettext (.po)

## gstack

Use the `/browse` skill from gstack for all web browsing. Never use `mcp__claude-in-chrome__*` tools.

Available gstack skills:
- `/office-hours` — Brainstorm a new idea
- `/plan-ceo-review` — Review a plan (strategy)
- `/plan-eng-review` — Review a plan (architecture)
- `/plan-design-review` — Review a plan (design)
- `/design-consultation` — Create a design system
- `/review` — Code review before merge
- `/ship` — Ready to deploy / create PR
- `/browse` — Fast headless browser for QA testing and site dogfooding
- `/qa` — Testing the app
- `/qa-only` — Run QA only
- `/design-review` — Visual design audit
- `/setup-browser-cookies` — Set up browser cookies
- `/retro` — Weekly retrospective
- `/investigate` — Debugging errors
- `/document-release` — Post-ship doc updates
- `/codex` — Second opinion or adversarial code review
- `/careful` — Working with production or live systems
- `/freeze` — Scope edits to one module/directory
- `/guard` — Maximum safety mode
- `/unfreeze` — Remove edit restrictions
- `/gstack-upgrade` — Upgrade gstack to latest version
