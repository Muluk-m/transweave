# Stack Research

**Domain:** i18n management platform (open-source conversion from MongoDB to relational DB)
**Researched:** 2026-03-01
**Confidence:** HIGH

## Executive Decision

**Use PGlite (dev) + PostgreSQL (prod) with Drizzle ORM, not SQLite + PostgreSQL.**

The original plan called for SQLite (dev) + PostgreSQL (prod). Research reveals a critical problem: Drizzle ORM uses **dialect-specific schema definitions** -- `pgTable` vs `sqliteTable` -- meaning you cannot share a single schema across both databases. This would require maintaining two parallel schemas, doubling migration effort and introducing drift risk.

**PGlite** (embedded WASM PostgreSQL, 3mb) solves this entirely: same `pgTable` schema, same Drizzle config, same migration files, zero Docker dependency for quick-start. Drizzle has first-class PGlite support. This is the correct architecture for a "zero-config dev, PostgreSQL prod" open-source project.

---

## Recommended Stack

### Core Technologies (Keep from existing)

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| Next.js | 15.x (current: 15.2.6) | Frontend framework | Already in use, no reason to change. Keep current major. | HIGH |
| NestJS | 11.x (current: 11.0.1) | Backend API framework | Already in use, mature, excellent DI and modular architecture. | HIGH |
| React | 19.x (current: 19.0.1) | UI library | Already in use, keep aligned with Next.js 15. | HIGH |
| TypeScript | 5.x (current in project) | Language | Already in use across entire monorepo. | HIGH |
| pnpm | 10.x (current: 10.8.0) | Package manager | Already in use as workspace manager. Keep. | HIGH |

### Database Layer (New)

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| Drizzle ORM | 0.45.x (latest: 0.45.1) | Database ORM | Best NestJS ORM in 2025: fastest performance, smallest bundle (7kb), TypeScript-first, supports both PGlite and PostgreSQL with identical `pgTable` schema. No binary dependencies. SQL-transparent queries. | HIGH |
| drizzle-kit | 0.31.x (latest: 0.31.9) | Migrations & schema tooling | Companion tool for Drizzle. Handles schema push, migration generation, and Drizzle Studio (DB browser). | HIGH |
| @electric-sql/pglite | 0.3.x (latest: 0.3.15) | Embedded PostgreSQL (dev/quick-start) | WASM PostgreSQL in 3mb. Same `pgTable` schema as production PostgreSQL. Zero Docker, zero install. Perfect for `docker-compose up` quick-start and development. File-based persistence or in-memory. | HIGH |
| PostgreSQL | 17.x (Docker: postgres:17-alpine) | Production database | Industry standard relational DB. Pin to major version 17 in Docker for stability. Alpine variant for smaller image. | HIGH |
| postgres (postgres.js) | 3.4.x (latest: 3.4.8) | PostgreSQL driver | Fastest PostgreSQL driver for Node.js. Native ESM. Used by Drizzle for production PostgreSQL connections. Preferred over `pg` for new projects. | MEDIUM |

### File Storage (New -- replacing QiLiangJia CDN)

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| @nestjs/platform-express | 11.x (latest: 11.1.14) | Multer file upload | Built into NestJS Express platform. Provides `FileInterceptor`, `diskStorage` for local file uploads. Already a transitive dependency. | HIGH |
| @nestjs/serve-static | 5.x (latest: 5.0.4) | Serve uploaded files | Official NestJS module. Serves local `./uploads` directory as static files. Replaces CDN URL serving. | HIGH |

### Authentication (Simplified -- replacing Feishu OAuth)

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| @nestjs/jwt | 11.x (current: 11.0.0) | JWT token management | Already in use. Keep for access/refresh token flow. | HIGH |
| bcrypt | 6.x (latest: 6.0.0) | Password hashing | Already used via `packages/server/src/utils/crypto.ts`. Upgrade to latest. | HIGH |
| passport-local | 1.x | Local auth strategy | Simple username/password strategy for Passport. Replaces Feishu OAuth strategy. | HIGH |

### Infrastructure (New)

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| Docker | 27.x+ | Containerization | Industry standard. Multi-stage builds for optimized images. | HIGH |
| Docker Compose | 2.x (compose v2) | Orchestration | Single `docker-compose up` to start entire stack (frontend + backend + PostgreSQL). Standard for self-hosted OSS tools. | HIGH |
| @nestjs/config | 4.x (latest: 4.0.3) | Environment config | Official NestJS config module. Validates env vars at startup. Already partially used. | HIGH |

### Supporting Libraries (Keep from existing)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Radix UI | current | Accessible UI primitives | All UI components -- already integrated |
| Tailwind CSS | 3.4.x | Styling | All styling -- already integrated |
| Jotai | 2.9.x | State management | Client-side state -- already integrated |
| React Hook Form | 7.54.x | Form handling | All forms -- already integrated |
| zod | 3.25.x | Validation | Schema validation (both client and server) -- already integrated |
| next-intl | 3.26.x | Frontend i18n | UI multilingual support -- already integrated |
| @modelcontextprotocol/sdk | 1.25.x | MCP server | Claude AI integration -- already integrated |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| drizzle-kit studio | Database browser | Built-in DB GUI. Run `npx drizzle-kit studio` to browse data. Replaces need for MongoDB Compass. |
| Docker Compose (dev) | Local dev environment | `docker-compose.dev.yml` with hot-reload volumes for both web and server. |
| ESLint 9.x | Linting | Already configured. Keep. |
| Prettier 3.x | Formatting | Already configured. Keep. |

---

## Installation

```bash
# Database layer (server package)
pnpm --filter server add drizzle-orm @electric-sql/pglite postgres

# Database dev tooling (server package)
pnpm --filter server add -D drizzle-kit

# File storage (server package)
pnpm --filter server add @nestjs/serve-static

# Auth (server package -- passport-local if not present)
pnpm --filter server add passport-local
pnpm --filter server add -D @types/passport-local

# Config (server package)
pnpm --filter server add @nestjs/config

# Remove MongoDB dependencies (server package)
pnpm --filter server remove mongoose @nestjs/mongoose @prisma/client
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not Alternative |
|----------|-------------|-------------|---------------------|
| ORM | **Drizzle ORM** | Prisma 7 | Prisma requires code generation step, has larger bundle (~90% bigger), and while v7 removed the Rust engine, Drizzle's SQL-first approach maps better to the relational migration from MongoDB. Prisma is already in the codebase as unused dependency -- remove it. |
| ORM | **Drizzle ORM** | TypeORM | TypeORM is legacy. Decorator-heavy, weaker TypeScript inference, known performance issues, and slower development pace. Not recommended for new projects in 2025. |
| ORM | **Drizzle ORM** | MikroORM | Excellent ORM but heavier abstraction than needed. Unit of Work pattern adds complexity for a straightforward CRUD i18n app. Better for large enterprise monoliths. |
| Dev DB | **PGlite** | SQLite (better-sqlite3) | SQLite requires separate `sqliteTable` schema definitions in Drizzle, creating dual-schema maintenance burden. PGlite uses same `pgTable` schema as production PostgreSQL -- one schema, two environments. |
| Dev DB | **PGlite** | Docker PostgreSQL for dev | PGlite enables true "zero dependency" quick-start: `pnpm dev` works without Docker installed. Docker PostgreSQL is still available as an alternative for developers who prefer it. |
| PG Driver | **postgres.js** | pg (node-postgres) | postgres.js is faster, native ESM, simpler API. `pg` is the legacy driver. Both work with Drizzle, but postgres.js is the modern choice. |
| File Storage | **Local disk + serve-static** | MinIO (S3-compatible) | MinIO adds Docker container complexity. Local disk storage with serve-static is simplest for self-hosted. Can always add MinIO/S3 adapter later as optional enhancement. |
| File Storage | **Local disk + serve-static** | Cloudflare R2 | R2 is a cloud dependency. Open-source self-hosted tools must work offline with local storage. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Mongoose** | MongoDB-specific ODM. Entire database layer is being replaced. | Drizzle ORM with PostgreSQL schema |
| **@nestjs/mongoose** | NestJS MongoDB integration module. Remove entirely. | Drizzle ORM module (custom or `@knaadh/nestjs-drizzle-pg`) |
| **@prisma/client** | Currently in `package.json` but unused. Dead dependency adding bloat. | Remove. Use Drizzle ORM. |
| **SQLite for dev** | Creates dual-schema problem with Drizzle (`sqliteTable` vs `pgTable`). | PGlite -- same PostgreSQL schema everywhere |
| **TypeORM** | Legacy ORM with weaker TypeScript support and performance issues. | Drizzle ORM |
| **`pg` driver** | Older PostgreSQL driver, callback-based API. | `postgres` (postgres.js) -- modern, faster, ESM |
| **Feishu SDK/OAuth** | Proprietary third-party dependency. Being removed for OSS. | Built-in username/password with passport-local |
| **External CDN upload** | Cloud dependency (QiLiangJia CDN / Cloudflare R2). | Local `./uploads` directory with `@nestjs/serve-static` |

---

## Stack Patterns by Variant

**Quick-start mode (default for new users):**
- PGlite embedded database (file: `./data/pglite/`)
- Local file storage (`./uploads/`)
- No Docker required
- Single command: `pnpm dev` starts everything

**Production mode (Docker Compose):**
- PostgreSQL 17 in Docker container
- Local file storage with Docker volume mount
- `docker-compose up` starts web + server + postgres
- Environment variables via `.env` file

**Production mode (external PostgreSQL):**
- Connect to existing PostgreSQL instance via `DATABASE_URL`
- Same server binary, different config
- For teams with existing database infrastructure

---

## Architecture: Database Abstraction Pattern

Since PGlite and PostgreSQL both use the `pg` dialect in Drizzle, the abstraction is at the **connection layer**, not the schema layer:

```typescript
// packages/server/src/database/schema.ts -- ONE schema, used everywhere
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name'),
  createdAt: timestamp('created_at').defaultNow(),
});

// packages/server/src/database/connection.ts -- switch by env
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import postgres from 'postgres';
import { PGlite } from '@electric-sql/pglite';

export function createDatabase() {
  const url = process.env.DATABASE_URL;

  if (url?.startsWith('postgresql://') || url?.startsWith('postgres://')) {
    // Production: real PostgreSQL
    const client = postgres(url);
    return drizzlePg(client);
  }

  // Development: embedded PGlite
  const client = new PGlite(process.env.PGLITE_DATA_DIR || './data/pglite');
  return drizzlePglite(client);
}
```

This pattern means:
- **One schema file** defines all tables
- **One migration set** works for both environments
- **Connection switching** is the only difference
- `drizzle-kit push` works against both PGlite and PostgreSQL

---

## Docker Compose Structure

```yaml
# docker-compose.yml (production)
services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: i18n
      POSTGRES_USER: i18n
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U i18n"]
      interval: 5s
      timeout: 5s
      retries: 5

  server:
    build:
      context: .
      dockerfile: packages/server/Dockerfile
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://i18n:${POSTGRES_PASSWORD}@postgres:5432/i18n
      JWT_SECRET: ${JWT_SECRET}
    volumes:
      - uploads:/app/uploads

  web:
    build:
      context: .
      dockerfile: packages/web/Dockerfile
    depends_on:
      - server
    environment:
      NEXT_PUBLIC_API_URL: http://server:3001
    ports:
      - "3000:3000"

volumes:
  pgdata:
  uploads:
```

Multi-stage Dockerfiles should use:
1. **Base stage:** `node:22-alpine` with corepack enable and pnpm
2. **Dependencies stage:** `pnpm fetch` + `pnpm install --frozen-lockfile`
3. **Build stage:** `pnpm build` with `--filter` for monorepo
4. **Production stage:** Copy only built artifacts + production node_modules

---

## Version Compatibility Matrix

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| drizzle-orm@0.45.x | drizzle-kit@0.31.x | Must keep ORM and Kit versions in sync. Both from same release. |
| drizzle-orm@0.45.x | @electric-sql/pglite@0.3.x | First-class support via `drizzle-orm/pglite` driver. |
| drizzle-orm@0.45.x | postgres@3.4.x | First-class support via `drizzle-orm/postgres-js` driver. |
| NestJS@11.x | @nestjs/serve-static@5.x | Version 5.x targets NestJS 11. |
| NestJS@11.x | @nestjs/config@4.x | Version 4.x targets NestJS 11. |
| NestJS@11.x | @nestjs/jwt@11.x | Same major version alignment. |
| Next.js@15.x | React@19.x | Next.js 15 requires React 19. |
| Node.js 22.x LTS | All packages above | Use Node 22 LTS in Docker (current LTS). Node 24 is current but not LTS yet. |

---

## Open-Source Project Tooling

| Concern | Recommendation | Rationale |
|---------|----------------|-----------|
| License | MIT | Most popular OSS license (1.53M pageviews in 2025). Maximum permissiveness for self-hosted tool. Both NestJS and Next.js use MIT. |
| Commit convention | Conventional Commits | Standard format enables automated changelogs. Already widely adopted. |
| Changelog | `changesets` or manual CHANGELOG.md | For a self-hosted tool (not an npm package), manual CHANGELOG.md per release is sufficient. |
| CI | GitHub Actions | Repository is already on GitHub. Free for public repos. |
| Docker registry | GitHub Container Registry (ghcr.io) | Free for public repos, integrated with GitHub Actions. Publish pre-built images. |

---

## Migration Strategy: MongoDB to PostgreSQL

The existing MongoDB schemas (6 collections) map cleanly to PostgreSQL tables:

| MongoDB Collection | PostgreSQL Table | Key Changes |
|-------------------|-----------------|-------------|
| User | users | `_id` (ObjectId) -> `id` (UUID). Remove `feishuOpenId`, `feishuUnionId` fields. |
| Team | teams | `_id` -> `id` (UUID). |
| Membership | memberships | `_id` -> `id` (UUID). Foreign keys to users and teams. |
| Project | projects | `_id` -> `id` (UUID). Foreign key to teams. |
| Token | tokens | `_id` -> `id` (UUID). `values` (embedded object) -> JSONB column or separate `token_values` table. |
| TokenHistory | token_history | `_id` -> `id` (UUID). Foreign key to tokens. `changes` -> JSONB column. |
| ActivityLog | activity_logs | `_id` -> `id` (UUID). `metadata` -> JSONB column. |

**Key decision:** Use PostgreSQL `jsonb` columns for semi-structured data (token values, history changes, activity metadata) rather than fully normalizing. This preserves the flexibility of the MongoDB document model where it makes sense, while gaining relational integrity for entity relationships.

---

## Sources

- [Drizzle ORM Official Docs](https://orm.drizzle.team/) -- schema declaration, PGlite integration, multi-database config (HIGH confidence)
- [Drizzle ORM GitHub Discussion #3396](https://github.com/drizzle-team/drizzle-orm/discussions/3396) -- PGlite as SQLite alternative for same-schema pattern (HIGH confidence)
- [PGlite Official Site](https://pglite.dev/) -- embedded PostgreSQL capabilities, benchmarks (HIGH confidence)
- [NestJS Official Docs - File Upload](https://docs.nestjs.com/techniques/file-upload) -- Multer integration (HIGH confidence)
- [NestJS Official Docs - Serve Static](https://docs.nestjs.com/recipes/serve-static) -- static file serving (HIGH confidence)
- [Best ORM for NestJS 2025 (DEV Community)](https://dev.to/sasithwarnakafonseka/best-orm-for-nestjs-in-2025-drizzle-orm-vs-typeorm-vs-prisma-229c) -- ORM comparison (MEDIUM confidence)
- [Drizzle vs Prisma 2026 (Bytebase)](https://www.bytebase.com/blog/drizzle-vs-prisma/) -- ORM comparison (MEDIUM confidence)
- [Trilon - NestJS & DrizzleORM](https://trilon.io/blog/nestjs-drizzleorm-a-great-match) -- NestJS integration patterns (MEDIUM confidence)
- [Docker Community Forums - NestJS + NextJS monorepo](https://forums.docker.com/t/best-practices-for-using-docker-in-development-vs-production-nestjs-nextjs-monorepo/149461) -- Docker best practices (MEDIUM confidence)
- [pnpm Docker docs](https://pnpm.io/docker) -- Multi-stage build patterns for pnpm monorepos (HIGH confidence)
- [Open Source Initiative - Top Licenses 2025](https://opensource.org/blog/top-open-source-licenses-in-2025) -- License selection (HIGH confidence)
- npm registry (direct version queries) -- All version numbers verified 2026-03-01 (HIGH confidence)

---
*Stack research for: qlj-i18n open-source conversion*
*Researched: 2026-03-01*
