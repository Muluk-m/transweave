# CLAUDE.md

Router for Claude Code working in this repository. Keep this file short — details live next to the code they describe.

## Hard rules (read first)

1. **DESIGN.md is binding.** Read it before any visual/UI change. Don't deviate without explicit user approval. In QA mode, flag any code that doesn't match.
2. **i18n must stay in sync.** Both `zh-CN.json` and `en-US.json` get updated together. Manage keys via `pnpm --filter @transweave/web i18n`.
3. **Web browsing uses the `/browse` gstack skill.** Never call `mcp__claude-in-chrome__*` tools.
4. **Commits follow Conventional Commits:** `type(scope): description` — `feat(web):`, `fix(server):`, `refine(web):`, etc.
5. **`JWT_SECRET` is required** for the server. Copy `.env.example` → `packages/server/.env` for local dev.
6. **Don't add a second UI library.** Compose with `packages/web/components/ui/*` (shadcn/Radix).

## What this is

Transweave — self-hosted i18n management platform. pnpm 10.8+ monorepo:

- `packages/server` — NestJS 11 API + MCP — see [packages/server/ARCHITECTURE.md](packages/server/ARCHITECTURE.md)
- `packages/web` — Next.js 15 frontend — see [packages/web/ARCHITECTURE.md](packages/web/ARCHITECTURE.md)
- `packages/cli` — `transweave` CLI — see [packages/cli/ARCHITECTURE.md](packages/cli/ARCHITECTURE.md)

DB: PostgreSQL in prod, PGlite locally (auto-selected when `DATABASE_URL` is unset — no install needed).

## Run / build / verify

```bash
pnpm install
pnpm dev:server                 # NestJS watch :3001
pnpm dev:web                    # Next.js dev :3000
pnpm dev:cli                    # CLI

pnpm build:server | build:web | build:cli

# Tests (see packages/server/ARCHITECTURE.md for the full list)
pnpm --filter @transweave/server test
pnpm --filter @transweave/server test:e2e

# Lint / format
pnpm --filter @transweave/server lint
pnpm --filter @transweave/server format
pnpm --filter @transweave/web    lint

# DB GUI
pnpm --filter @transweave/server drizzle-kit studio

# Docker
docker compose up -d                                # prod (pre-built)
docker compose -f docker-compose.dev.yml up -d      # dev (builds from source)
```

A change is "verified" when: the relevant `lint` passes, server unit tests pass, and (for UI changes) the page has been exercised in a browser via `/browse` or `/qa`.

## Where to look

| You need… | Look at |
|---|---|
| Backend internals | `packages/server/ARCHITECTURE.md` |
| Frontend internals | `packages/web/ARCHITECTURE.md` |
| CLI commands | `packages/cli/ARCHITECTURE.md` |
| Visual rules | `DESIGN.md` |
| Project state / current phase | `.planning/STATE.md` |
| Strategic plan | `.planning/PROJECT.md`, `.planning/ROADMAP.md` |
| Backlog (open / parked) | `TODOS.md` |
| Spec changes | `openspec/` |
| API reference / webhooks | `docs/api-reference.md`, `docs/webhook-events.md` |
| User-facing readme | `README.md` (zh) / `README.en.md` (en) |

## gstack

A full list of gstack skills is in the user-scope `~/.claude/CLAUDE.md` — don't duplicate it here. Project-specific rule: always use `/browse`, never `mcp__claude-in-chrome__*`.
