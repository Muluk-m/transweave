# Phase 9: Deployment & Production Readiness - Research

**Researched:** 2026-03-01
**Domain:** Docker Compose packaging, environment configuration, health checks, setup documentation
**Confidence:** HIGH

## Summary

Phase 9 packages the entire qlj-i18n platform for one-command deployment. By this point (after Phases 1-8), the application has a working NestJS backend with Drizzle ORM (PGlite/PostgreSQL), a Next.js frontend, local file storage, auth, and all features. This phase writes the deployment infrastructure: a production `docker-compose.yml` with three services (web, server, postgres), proper health checks so services start in the correct order, Docker volumes for data persistence, a `.env.example` documenting all variables, and a README with step-by-step instructions for both Docker and non-Docker setups.

The existing Docker files are a starting point but have significant issues: the `docker-compose.yml` is MongoDB-only with hardcoded internal names ("bondma"), `Dockerfile.server` has a `--frozen-lockfil` typo, both Dockerfiles use `pnpm@latest` (non-reproducible), there is no `.dockerignore`, the runner stage installs dependencies AND copies node_modules from builder (duplicating work), and Next.js build-time environment variables (`NEXT_PUBLIC_*`) are not handled via build args. All of these must be rewritten.

The non-Docker path (PGlite) is straightforward: when `DATABASE_URL` is not set, the server uses PGlite as an embedded database. This requires no Docker, no PostgreSQL installation. The README must make this the "quickest" path while clearly documenting Docker as the production path.

**Primary recommendation:** Rewrite all Docker files from scratch using the patterns from STACK.md research. Create a complete `.env.example` and a README that gets users to a running platform in under 5 minutes via either `docker-compose up` or `pnpm dev`.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DEPL-01 | Application runs via docker-compose up with PostgreSQL | Docker Compose with three services (web, server, postgres), health checks on postgres, depends_on with condition:service_healthy |
| DEPL-02 | Application runs without Docker using PGlite (zero-config quick-start) | DATABASE_URL detection pattern already designed in Phase 2; README documents `pnpm dev` path |
| DEPL-03 | .env.example documents all required and optional environment variables | Full catalog of env vars from codebase analysis (7 server-side, 1 client-side build-time) |
| DEPL-04 | Docker health checks ensure services start in correct order | PostgreSQL `pg_isready` health check + `depends_on: condition: service_healthy` for server and web |
| DEPL-05 | Data persists across container restarts via Docker volumes | Named volumes for `pgdata` and `uploads`, mapped to container paths |
| DEPL-06 | README with clear setup instructions for both Docker and local development | Two paths: Docker (3 steps) and local dev (4 steps), with troubleshooting section |
</phase_requirements>

## Standard Stack

### Core

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Docker Engine | 27.x+ | Container runtime | Industry standard, required for docker-compose |
| Docker Compose | v2 (integrated) | Multi-container orchestration | `docker compose` (v2) is built into Docker Desktop; no separate install. Standard for self-hosted OSS tools |
| PostgreSQL | 17-alpine | Production database | Matches Phase 2 schema; alpine variant is ~80MB vs ~400MB for full image |
| Node.js | 22-alpine | Runtime base image | Current LTS (22.x); alpine for smallest image size |
| pnpm | 10.8.0 (pinned) | Package manager | Must match `packageManager` field in root package.json for reproducible builds |

### Supporting

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `pg_isready` | PostgreSQL health check command | Built into postgres image; used in docker-compose healthcheck |
| `corepack` | pnpm version management | Built into Node.js 22; use `corepack enable` + `corepack prepare pnpm@10.8.0` |
| Docker build args | Pass build-time variables | Required for Next.js `NEXT_PUBLIC_*` variables which are baked at build time |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Docker Compose | Kubernetes / Helm | K8s is overkill for a self-hosted single-node tool; docker-compose is the standard for "easy deploy" OSS projects |
| Multi-stage Dockerfile | Single-stage Dockerfile | Multi-stage produces 2-3x smaller images by excluding build tools from production |
| `postgres:17-alpine` | `postgres:17` | Alpine is ~80MB vs ~400MB; some edge cases with locale support, but not relevant here |
| Named volumes | Bind mounts | Named volumes are managed by Docker and portable; bind mounts are host-path specific and can cause permission issues |

## Architecture Patterns

### Recommended Docker Structure

```
project-root/
├── docker-compose.yml          # Production: web + server + postgres
├── .env.example                # Template for all environment variables
├── .dockerignore               # Exclude node_modules, .git, .env, etc.
├── packages/
│   ├── server/
│   │   └── Dockerfile          # Multi-stage build for NestJS server
│   └── web/
│       └── Dockerfile          # Multi-stage build for Next.js frontend
└── README.md                   # Setup instructions
```

### Pattern 1: Multi-Stage Dockerfile for pnpm Monorepo

**What:** Four-stage Dockerfile that produces minimal production images from a pnpm workspace.
**When to use:** Both web and server Dockerfiles follow this pattern.

```dockerfile
# Stage 1: Base with pnpm
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.8.0 --activate
WORKDIR /app

# Stage 2: Install dependencies (cached layer)
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/server/package.json ./packages/server/
RUN pnpm install --frozen-lockfile

# Stage 3: Build
FROM deps AS builder
COPY packages/server ./packages/server
RUN pnpm --filter server build

# Stage 4: Production runner
FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@10.8.0 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/server/package.json ./packages/server/
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/packages/server/dist ./packages/server/dist
ENV NODE_ENV=production
CMD ["node", "packages/server/dist/main.js"]
```

### Pattern 2: Docker Compose Service Orchestration with Health Checks

**What:** Three-service compose file with dependency ordering via health checks.
**When to use:** Production deployment.

```yaml
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-i18n}
      POSTGRES_USER: ${POSTGRES_USER:-i18n}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-i18n} -d ${POSTGRES_DB:-i18n}"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  server:
    build:
      context: .
      dockerfile: packages/server/Dockerfile
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-i18n}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-i18n}
      JWT_SECRET: ${JWT_SECRET:?JWT_SECRET is required}
      PORT: 3001
    volumes:
      - uploads:/app/uploads
    restart: unless-stopped

  web:
    build:
      context: .
      dockerfile: packages/web/Dockerfile
      args:
        NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-http://localhost:3001}
    depends_on:
      - server
    ports:
      - "${WEB_PORT:-3000}:3000"
    restart: unless-stopped

volumes:
  pgdata:
  uploads:
```

### Pattern 3: Next.js Build-Time vs Runtime Environment Variables

**What:** Next.js bakes `NEXT_PUBLIC_*` variables into the JavaScript bundle at build time. Changing `.env` after build has no effect.
**When to use:** Any `NEXT_PUBLIC_*` variable in the web Dockerfile.

```dockerfile
# In web Dockerfile, accept as build arg
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN pnpm build
```

This means `docker-compose build --build-arg NEXT_PUBLIC_API_URL=https://myserver.com` must be run when the API URL changes. The `.env.example` must document this clearly.

### Pattern 4: Database Migration in Server Entrypoint

**What:** Run Drizzle migrations automatically when the server starts, before accepting connections.
**When to use:** Server startup in Docker.

The server's `main.ts` (or a dedicated bootstrap script) should run `drizzle-kit push` or apply migrations on startup. This ensures the database schema is always up-to-date when deploying a new version.

### Anti-Patterns to Avoid

- **Using `pnpm@latest` in Dockerfiles:** Non-reproducible builds. Pin to exact version matching `packageManager` in package.json.
- **Using `CMD cd dir && command`:** Does not handle signals properly. Use `CMD ["node", "path/to/main.js"]` or `WORKDIR` + `CMD`.
- **Copying node_modules from builder AND installing in runner:** Choose one. Either copy from builder or install fresh with `--prod`. Not both.
- **Bind-mounting .env into containers:** Secrets are visible on the host filesystem. Use environment variables in docker-compose.yml referencing the `.env` file (Docker Compose does this by default).
- **Hardcoding database credentials in docker-compose.yml:** Use variable substitution with `${VAR}` syntax and document in `.env.example`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PostgreSQL readiness check | Custom TCP probe or curl script | `pg_isready` (built into postgres image) | Handles auth, connection state, replication status correctly |
| pnpm version management | Manual `npm install -g pnpm@version` | `corepack enable && corepack prepare pnpm@10.8.0` | Built into Node.js, ensures exact version match |
| Environment variable validation | Custom startup checks | `${VAR:?error message}` in docker-compose + `@nestjs/config` with Joi/zod schema | Docker-level validation catches missing vars before container starts |
| Docker layer caching | Manual cache management | Proper COPY ordering (lockfile first, then source) | Docker automatically caches unchanged layers |
| Signal handling in containers | Custom signal trapping | `CMD ["node", "..."]` (exec form, not shell form) | Node.js receives SIGTERM directly, enabling graceful shutdown |

**Key insight:** Docker and Docker Compose provide all the primitives needed for deployment. The work is writing correct configuration, not building deployment infrastructure.

## Common Pitfalls

### Pitfall 1: Next.js NEXT_PUBLIC_* Variables Not Available at Runtime

**What goes wrong:** Environment variables prefixed with `NEXT_PUBLIC_` are replaced at build time by Next.js. Setting them in docker-compose `environment:` has no effect because the build already happened with different values.
**Why it happens:** Next.js inlines these values into the JavaScript bundle during `next build`. This is a fundamental design choice, not a bug.
**How to avoid:** Pass `NEXT_PUBLIC_*` variables as Docker build args. Document in `.env.example` that changing these requires rebuilding the web image.
**Warning signs:** Frontend making API requests to `localhost:3001` even when deployed on a remote server.

### Pitfall 2: Docker Build Context Too Large (No .dockerignore)

**What goes wrong:** Without `.dockerignore`, Docker sends the entire monorepo to the daemon: `node_modules` (~500MB+), `.git` (~50MB+), `.next` build artifacts, and potentially `.env` files with secrets.
**Why it happens:** No `.dockerignore` exists in the current codebase.
**How to avoid:** Create `.dockerignore` excluding: `node_modules`, `.git`, `.next`, `dist`, `.env*`, `*.md`, `coverage`, `.planning`.
**Warning signs:** `docker build` output showing "Sending build context to Docker daemon" > 100MB; build taking > 2 minutes for code-only changes.

### Pitfall 3: Server Starts Before Database is Ready

**What goes wrong:** Without health checks, `depends_on` only waits for the container to start, not for PostgreSQL to accept connections. The server crashes on startup with "connection refused".
**Why it happens:** Docker Compose `depends_on` without `condition: service_healthy` only checks if the container is running, not if the service inside it is ready.
**How to avoid:** Add `healthcheck` to the postgres service using `pg_isready`. Use `depends_on: postgres: condition: service_healthy` in the server service.
**Warning signs:** Server container restarting repeatedly in logs; "ECONNREFUSED" errors at startup.

### Pitfall 4: Data Lost on Container Restart (No Volumes)

**What goes wrong:** PostgreSQL data and uploaded files are stored inside the container's writable layer. Running `docker-compose down` or even restarting a container loses all data.
**Why it happens:** Docker containers are ephemeral by design. Data must be explicitly persisted via volumes.
**How to avoid:** Named volumes for `pgdata` (PostgreSQL data directory) and `uploads` (file storage). Map in docker-compose.yml.
**Warning signs:** Users losing all data after running `docker-compose down && docker-compose up`.

### Pitfall 5: Non-Reproducible Builds with pnpm@latest

**What goes wrong:** Using `corepack prepare pnpm@latest` in Dockerfiles means builds use whatever pnpm version is "latest" at build time. A pnpm update weeks later can introduce breaking changes or different lockfile resolution.
**Why it happens:** The existing Dockerfiles both use `pnpm@latest`.
**How to avoid:** Pin pnpm version to match the root `package.json` `packageManager` field: `pnpm@10.8.0`.
**Warning signs:** Builds that worked last month failing with cryptic pnpm errors; different dependency trees between local and Docker builds.

### Pitfall 6: --frozen-lockfile Typo in Existing Dockerfile

**What goes wrong:** `Dockerfile.server:13` has `--frozen-lockfil` (missing `e`). pnpm ignores the unknown flag and proceeds without frozen lockfile enforcement, meaning the lockfile can be modified during the build.
**Why it happens:** Typo.
**How to avoid:** Use `--frozen-lockfile` (correct spelling). Verify by checking that the Dockerfile build fails when `pnpm-lock.yaml` is out of sync with `package.json`.
**Warning signs:** Docker builds succeeding even when lockfile is stale.

## Code Examples

### Complete .env.example

```bash
# =============================================================================
# qlj-i18n Environment Configuration
# =============================================================================
# Copy this file to .env and fill in the values.
# Required variables are marked with [REQUIRED].
# Optional variables show their default values.

# --- Database ---
# [REQUIRED for Docker] PostgreSQL connection string
# Omit entirely for PGlite (zero-config local development)
DATABASE_URL=postgresql://i18n:changeme@localhost:5432/i18n

# PostgreSQL settings (Docker Compose only)
POSTGRES_DB=i18n
POSTGRES_USER=i18n
POSTGRES_PASSWORD=changeme  # [REQUIRED] Change this!

# --- Authentication ---
# [REQUIRED] Secret key for signing JWT tokens. Generate with: openssl rand -base64 64
JWT_SECRET=

# --- Server ---
# Port the backend API listens on
PORT=3001

# Directory for uploaded files (screenshots, etc.)
UPLOAD_DIR=./uploads

# --- Frontend ---
# URL where the backend API is accessible from the browser
# [BUILD-TIME] Changing this requires rebuilding the web image
NEXT_PUBLIC_API_URL=http://localhost:3001

# Port to expose the web UI on (Docker Compose only)
WEB_PORT=3000

# --- AI Translation (Optional) ---
# Leave empty to disable AI translation features
# Provider: openai | claude | deepl | google
AI_PROVIDER=
AI_API_KEY=

# --- Development ---
# PGlite data directory (used when DATABASE_URL is not set)
PGLITE_DATA_DIR=./data/pglite
```

### Complete .dockerignore

```
node_modules
.git
.gitignore
.next
dist
coverage
.env
.env.*
.planning
*.md
!packages/*/README.md
.DS_Store
*.log
.vscode
.idea
```

### Server Health Check Endpoint

The NestJS server should expose a `/health` endpoint for Docker health checks and load balancers:

```typescript
// packages/server/src/health/health.controller.ts
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
```

The server Dockerfile can then use:
```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Docker Compose v1 (`docker-compose` command) | Docker Compose v2 (`docker compose` integrated) | 2023 | v1 is deprecated; use `docker compose` without hyphen |
| `node:20-alpine` base image | `node:22-alpine` (LTS) | 2024 | Node 22 is current LTS through April 2027 |
| `npm install -g pnpm` | `corepack enable && corepack prepare` | 2023 | Corepack is built into Node.js, ensures exact version |
| `COPY . .` in Dockerfile | Layer-optimized COPY (lockfile first) | Standard practice | Dramatically improves build cache hit rate |
| `depends_on: [service]` | `depends_on: service: condition: service_healthy` | Compose v2.1 | Prevents race conditions between services |

## Open Questions

1. **Server-side rendering API URL**
   - What we know: Next.js SSR needs to reach the server from inside Docker network (http://server:3001), but client-side needs to reach it from the browser (http://localhost:3001 or custom domain).
   - What's unclear: Whether the current codebase uses SSR for API calls or is fully client-side.
   - Recommendation: Add `NEXT_INTERNAL_API_URL` for server-side API calls within Docker network. The existing commented-out docker-compose.yml already shows this pattern (`NEXT_INTERNAL_API_URL=http://server:3001`). Keep `NEXT_PUBLIC_API_URL` for client-side.

2. **Drizzle migration strategy at startup**
   - What we know: The server needs to apply database migrations before accepting connections.
   - What's unclear: Whether Phase 2 implements programmatic migration or relies on `drizzle-kit push` CLI command.
   - Recommendation: If Phase 2 uses `drizzle-kit push`, the server entrypoint script should run it before starting. If Phase 2 implements programmatic migration, it runs in `main.ts` bootstrap.

## Sources

### Primary (HIGH confidence)
- Existing `docker-compose.yml`, `Dockerfile.server`, `Dockerfile.web` in codebase -- analyzed for current state and issues
- `.planning/research/STACK.md` -- Docker Compose structure pattern, multi-stage Dockerfile pattern
- `.planning/research/PITFALLS.md` -- Pitfall 5 (Docker build context), Pitfall 6 (SQLite/PG differences relevant to non-Docker mode)
- `packages/server/.env` -- current environment variable catalog
- `package.json` -- `packageManager` field for pinned pnpm version
- Codebase `process.env.*` grep -- complete env var usage map

### Secondary (MEDIUM confidence)
- Docker Compose v2 specification -- health check syntax, depends_on conditions
- pnpm Docker documentation (https://pnpm.io/docker) -- multi-stage build patterns for pnpm monorepos
- Next.js environment variable documentation -- build-time vs runtime behavior

### Tertiary (LOW confidence)
- None -- all findings are based on codebase inspection and established Docker patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Docker and Docker Compose are mature, well-documented tools with established patterns
- Architecture: HIGH - Three-service compose file is the standard pattern used by Tolgee, Weblate, and other self-hosted OSS tools
- Pitfalls: HIGH - All pitfalls identified from actual codebase inspection of existing Docker files and env var usage

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable domain, Docker patterns change slowly)
