# Design: Migrate to Vercel + Fly.io

## Architecture

```
Vercel (前端)                    Fly.io (后端+DB)
┌──────────────┐                ┌──────────────┐
│  Next.js     │   HTTPS/API   │  NestJS      │
│  *.vercel.app│───────────────▶│  *.fly.dev   │
└──────────────┘                └──────┬───────┘
                                       │
                                ┌──────▼───────┐
                                │  Fly Postgres │
                                └──────────────┘
```

## Code Changes Required

### 1. CORS Configuration (server)

In `main.ts`, add `app.enableCors()` with configurable origin via `CORS_ORIGIN` env var.

- Production: `CORS_ORIGIN=https://transweave.vercel.app`
- Development: defaults to `*` (allow all)
- Supports comma-separated multiple origins

### 2. Fly.io Config (server)

Create `fly.toml` in `packages/server/` for Fly.io deployment:
- Use existing `packages/server/Dockerfile`
- 256MB shared-cpu-1x VM
- Internal port 3001
- Health check on `/health`

### 3. Vercel Config (web)

Minimal — Vercel auto-detects Next.js monorepo. Only needs:
- Set `NEXT_PUBLIC_API_URL` env var pointing to Fly.io backend
- Root directory: `packages/web`

## No Changes Needed

- Dockerfile (reused by Fly.io)
- Database schema / Drizzle config
- API logic / auth flow (Bearer token, not cookies — no cross-domain issues)
- Docker Compose (local dev unchanged)
