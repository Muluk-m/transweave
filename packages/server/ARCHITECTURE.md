# Server Architecture

NestJS 11 backend exposing REST + MCP endpoints, backed by PostgreSQL (prod) or PGlite (local dev, auto-selected when `DATABASE_URL` is unset).

Stack: NestJS 11 · Drizzle ORM · Passport JWT · class-validator.

## Layered layout (`src/`)

```
controller/   HTTP route handlers (one file per resource)
service/      Business logic
repository/   Data access (Drizzle queries)
db/
  schema/     Drizzle table definitions
  migrations/ Auto-run on startup
  drizzle.*   Module/provider/types/test-utils
dto/          Request/response DTOs (class-validator)
ai/           Translation providers (pluggable)
modules/      Cross-cutting Nest modules (e.g. file-storage)
jwt/          Passport JWT strategy + guard
middleware/   Express middleware
interceptors/ Nest interceptors (logging, transforms)
config/       Env/config wiring
utils/        Shared helpers
health/       Liveness/readiness endpoint
docs/         OpenAPI/Swagger assets
lint/         Server-side i18n lint rules
```

## Controllers (`src/controller/`)

`auth`, `user`, `team`, `project`, `token`, `api-key`, `mcp`, `upload`, `file`, `seed`, `agent`, `ai-prompt-template`, `glossary`, `translation-memory`, `webhook`, `activity-log`, `badge`, `lint`, `index`.

AI endpoints live separately under `src/ai/` (`ai.controller.ts`, `ai-config.controller.ts`, `ai-connectors.controller.ts`, `ai-defaults.controller.ts`).

## DB schema (`src/db/schema/`)

`users`, `teams`, `memberships`, `projects`, `tokens`, `token-history`, `api-keys`, `activity-logs`, `files`, `glossary`, `translation-memory`, `ai-prompt-templates`, `ai-connectors`, `agent-sessions`, `webhooks`, `relations`.

Drizzle migrations live in `db/migrations/` and run automatically on server startup. Browse with `pnpm --filter @transweave/server drizzle-kit studio`.

## AI providers (`src/ai/providers/`)

Pluggable via `provider-factory.ts` against `translation-provider.interface.ts`:

- `openai`, `claude`, `deepseek`, `gemini` — share `base-openai-compatible.provider.ts`
- `deepl`, `google-translate` — bespoke providers
- `prompt.ts` + `prompts/` — system prompt assembly
- `json-extract.ts` — robust JSON parsing for non-strict providers
- `encryption.util.ts` — at-rest encryption for provider credentials

## Auth & security

- **JWT** via Passport (15-day expiry), strategy + guard in `jwt/`
- **Rate limiting**: 100 req / 60s via NestJS Throttler
- **API keys** for programmatic access (CLI, MCP clients)

## MCP

Built-in Model Context Protocol server at `controller/mcp.controller.ts` for AI assistant integration. Exposes project translations as MCP tools/resources.

## Tests

- Unit: `pnpm --filter @transweave/server test`
- Single file: `pnpm --filter @transweave/server test -- --testPathPattern=<pattern>`
- E2E: `pnpm --filter @transweave/server test:e2e` (uses `--runInBand`)
- Coverage: `pnpm --filter @transweave/server test:cov`

Jest requires `--experimental-vm-modules` (already wired into the scripts).
