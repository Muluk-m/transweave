# Tasks: Migrate to Vercel + Fly.io

## Code Changes

- [x] 1. Add CORS configuration to `packages/server/src/main.ts` — `app.enableCors()` with `CORS_ORIGIN` env var support
- [x] 2. Create `fly.toml` for server deployment on Fly.io
- [x] 3. ~~`.dockerignore`~~ — already exists at monorepo root, reused by Fly.io

## Platform Setup (manual, not code)

- [x] 4. Fly.io: create app + Postgres, set secrets (JWT_SECRET, CORS_ORIGIN, DATABASE_URL)
- [x] 5. Vercel: connect repo, set root directory to `packages/web`, set NEXT_PUBLIC_API_URL
- [x] 6. ~~GitHub Actions~~ — Not needed, Render auto-deploys on push to master
