# Pitfalls Research

**Domain:** Internal-to-open-source i18n platform conversion (MongoDB to SQLite/PostgreSQL, Docker deployment)
**Researched:** 2026-03-01
**Confidence:** HIGH (based on codebase inspection + verified community patterns)

## Critical Pitfalls

### Pitfall 1: Leaked Secrets and Internal References in Git History

**What goes wrong:**
The `opensource` branch will be created from `master`, inheriting its full git history. The codebase currently contains: a hardcoded MongoDB ObjectId for a default team (`680f557b932fa3656cbae929` in `auth.service.ts:154`), a hardcoded super-admin email (`maqiqian@qiliangjia.com` in `superAdmin.ts`), internal CDN URLs (`https://qlj-devhub-homepage.qiliangjia.one/api/uploads` in `upload.ts`), Feishu OAuth endpoint references, a fallback JWT secret (`'your-secret-key'` in `jwt/strategy.ts`), and a `packages/server/.env` file that is NOT gitignored (`.gitignore` only excludes `.env*.local`). Even if these are removed from source files, they remain in git history.

**Why it happens:**
Developers focus on cleaning current files but forget that `git log -p` exposes every secret ever committed. The `.gitignore` pattern `.env*.local` does not cover `.env` files. Internal MongoDB ObjectIds and email addresses appear harmless but leak organizational structure and identity.

**How to avoid:**
1. Before creating the `opensource` branch, audit the full repo with `gitleaks detect --source .` or `trufflehog git file://.`
2. Add `.env` (not just `.env*.local`) to `.gitignore` immediately
3. Create the opensource branch as an orphan branch (`git checkout --orphan opensource`) with a clean first commit, rather than branching from master. This eliminates all prior history.
4. Build a checklist of every string containing `qiliangjia`, `feishu`, `bondma`, `qlj`, and specific emails/IDs. Grep found these across 38 files currently.
5. After cleanup, run the secret scanner again on the new branch to verify

**Warning signs:**
- `grep -r "qiliangjia\|feishu\|bondma\|qlj" --include="*.ts" --include="*.tsx" --include="*.json"` returning any results on the opensource branch
- `.env` file accessible in repository
- Any hardcoded email addresses, MongoDB ObjectIds, or API endpoints in source code

**Phase to address:**
Phase 1 (Repository Setup / Branch Creation) -- must be the very first task before any other work begins on the opensource branch.

---

### Pitfall 2: MongoDB `Schema.Types.Mixed` and `Map` Types Have No Direct Relational Equivalent

**What goes wrong:**
The codebase stores critical data in schemaless MongoDB fields that cannot be directly mapped to relational columns:
- `Token.translations`: `Schema.Types.Mixed` storing `Record<string, any>` -- dynamic keys per language (e.g., `{"en": "Hello", "zh-CN": "..."}`)
- `TokenHistory.translations`: Same pattern for historical snapshots
- `ActivityLog.details`: `Schema.Types.Mixed` storing `ActivityDetails` with nested `changes[]` arrays and arbitrary `metadata`
- `Project.languageLabels`: `Map<string, string>` type

Teams typically either (a) try to normalize these into relational tables (creating an explosion of rows and complex JOINs) or (b) dump everything into a single `TEXT` column as JSON (losing queryability). Both approaches fail at different scales.

**Why it happens:**
MongoDB's flexible schema encourages storing heterogeneous data in single documents. When migrating to relational databases, developers underestimate how deeply `Mixed` types are embedded in application logic. The 50+ occurrences of `Record<string, ...>` in the service layer show this is not a peripheral pattern -- it is the core data model.

**How to avoid:**
1. Use PostgreSQL's `JSONB` columns for `translations`, `details`, and `languageLabels` -- this preserves queryability (GIN indexes, `->` operator) while accepting dynamic keys
2. For SQLite, use `TEXT` columns with `JSON()` functions (SQLite 3.38+ supports `json_extract`, `json_each`)
3. Create a dedicated `translation` table with `(token_id, language_code, value)` as the normalized form, but also keep a JSONB snapshot column for fast reads. The read path uses JSONB; the write path updates both.
4. Do NOT attempt to create one column per language -- the set of languages is dynamic per project
5. For `TokenHistory`, use a separate `token_history` table with a JSONB `translations_snapshot` column rather than embedding history arrays inside the token record

**Warning signs:**
- ORM schema definitions that use `string` type for what should be JSONB
- Import/export utilities silently dropping data because JSON nested structures are flattened
- Queries that work on PostgreSQL but fail on SQLite due to missing JSON function support
- N+1 query patterns emerging when normalized translation rows replace embedded documents

**Phase to address:**
Phase 2 (Database Abstraction Layer) -- the schema design must be settled before any service layer migration begins. This is the highest-risk design decision in the entire conversion.

---

### Pitfall 3: MongoDB `.populate()` Chains and Transactions Cannot Be Mechanically Translated to SQL JOINs

**What goes wrong:**
The codebase uses 30+ `.populate()` calls (with nested population like `{ path: 'tokens', populate: { path: 'history.user' } }`) and 10+ explicit `session.withTransaction()` blocks that require a MongoDB replica set. These patterns do not map one-to-one to SQL:
- `.populate()` becomes `JOIN` but the deeply nested population (`project -> tokens -> history -> user`) requires multi-table JOINs or separate queries
- MongoDB sessions require `replicaSet=rs0` (visible in `database.module.ts` connection string) -- this is a MongoDB-specific concept with no relational equivalent
- The `withTransaction()` utility in `utils/transaction.ts` wraps Mongoose sessions -- the entire abstraction must be replaced

**Why it happens:**
Mongoose `.populate()` is syntactic sugar for what relational databases do natively with JOINs, but the translation is not mechanical. Nested populate chains generate multiple sequential queries in Mongoose; a naive conversion to multiple JOINs can produce cartesian explosions. Meanwhile, developers familiar with MongoDB transactions may not realize that SQLite has fundamentally different transaction semantics (single-writer, WAL mode journal).

**How to avoid:**
1. Map every `.populate()` call to its equivalent SQL query strategy BEFORE starting migration. Some will become JOINs, others should become separate queries with `IN()` clauses.
2. Replace the `withTransaction()` utility with an ORM-native transaction API (e.g., Drizzle's `db.transaction()` or TypeORM's `QueryRunner`)
3. For SQLite, use `IMMEDIATE` transactions instead of `DEFERRED` (default) to avoid `SQLITE_BUSY` errors under concurrent writes
4. Design the repository layer with an interface that abstracts both `populate` (document) and `JOIN` (relational) patterns behind a single method signature
5. Do not attempt to convert `.aggregate()` pipelines (found in `activity-log.service.ts`) to SQL in one step -- rewrite them as native SQL queries

**Warning signs:**
- Service methods that call `.populate()` more than 2 levels deep
- Test queries returning correct data on PostgreSQL but timing out on SQLite
- `SQLITE_BUSY` errors under normal API usage (indicates transaction contention)
- Aggregate pipeline results differing between MongoDB and the SQL rewrite

**Phase to address:**
Phase 2 (Database Abstraction Layer) and Phase 3 (Service Layer Migration). The abstraction design happens in Phase 2; the actual rewrite of each service method happens in Phase 3.

---

### Pitfall 4: Hardcoded Internal Team ID Breaks All New Deployments

**What goes wrong:**
`auth.service.ts:154` hardcodes `const defaultTeam = '680f557b932fa3656cbae929'` -- a MongoDB ObjectId pointing to a specific team in the internal deployment. Every new Feishu login auto-joins this team. When the database is replaced with SQLite/PostgreSQL using auto-increment or UUID primary keys, this reference becomes meaningless. Any new open-source deployment will crash or silently fail on user registration if this code path executes.

**Why it happens:**
Internal tools frequently hardcode database IDs that "always exist" in their deployment environment. These become invisible landmines when the database is recreated from scratch.

**How to avoid:**
1. Replace the hardcoded ObjectId with a configurable environment variable (`DEFAULT_TEAM_ID`) or a database seed mechanism
2. The `joinDefaultTeam()` method itself may not be needed in the open-source version (since Feishu auth is being removed), but the pattern should be audited: grep for any other hardcoded ObjectId strings in the codebase
3. Create a "first run" setup flow that creates an initial admin user and team, rather than assuming pre-existing data

**Warning signs:**
- Any 24-character hex string in source code (MongoDB ObjectId format: `/[0-9a-f]{24}/`)
- Service methods that reference specific database records by ID without configuration
- Fresh deployments failing with "Team not found" or similar errors

**Phase to address:**
Phase 1 (Cleanup) for removing the hardcoded ID, and Phase 3 (Auth System Replacement) for implementing the first-run setup flow.

---

### Pitfall 5: Docker Build Context Copies Entire Monorepo

**What goes wrong:**
The existing `Dockerfile.server` and `Dockerfile.web` use the monorepo root as build context (`COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./`). This means every `docker build` sends the entire monorepo to the Docker daemon, including `node_modules`, `.next` build artifacts, `.git` history, and potentially `.env` files. Build times are slow, layer caching is invalidated by unrelated changes, and secrets can leak into Docker images.

Specific issues found:
- `Dockerfile.server:13` has a typo: `--frozen-lockfil` (missing `e`)
- No `.dockerignore` file exists in the repository
- Both Dockerfiles install dependencies in the runner stage AND copy `node_modules` from builder (`COPY --from=builder /app/packages/server/node_modules`), resulting in duplicate/conflicting dependencies
- `pnpm@latest` is used instead of a pinned version, meaning builds are not reproducible

**Why it happens:**
Monorepo Docker builds are genuinely complex. The build context must include workspace-level configuration files while excluding other packages' source code. Without a `.dockerignore`, everything gets sent.

**How to avoid:**
1. Create a `.dockerignore` file excluding `node_modules`, `.git`, `.next`, `dist`, `.env*`, `*.md`, and test files
2. Pin the pnpm version in Dockerfiles to match `package.json`'s `packageManager` field (`pnpm@10.8.0`)
3. Fix the `--frozen-lockfil` typo to `--frozen-lockfile`
4. In the runner stage, either install production dependencies fresh OR copy from builder, not both
5. For the open-source docker-compose, include health checks and proper dependency ordering between services
6. Consider using Docker build arguments for `NEXT_PUBLIC_API_URL` since Next.js bakes environment variables at build time

**Warning signs:**
- Docker build taking more than 2 minutes for a code-only change
- Docker images larger than 500MB for a Node.js application
- `docker build` output showing "Sending build context to Docker daemon" with a size > 100MB
- Environment variables not taking effect after changing `.env` (because Next.js baked them at build time)

**Phase to address:**
Phase 4 (Docker Deployment) -- but the `.dockerignore` should be created in Phase 1 alongside the branch setup.

---

### Pitfall 6: SQLite and PostgreSQL Behave Differently on Common Operations

**What goes wrong:**
The dual-database strategy (SQLite for quick-start, PostgreSQL for production) creates a surface area where identical application code produces different behavior:
- **Type coercion:** SQLite uses dynamic typing; inserting `"42"` into an INTEGER column stores `"42"` as text, not `42`. PostgreSQL rejects type mismatches.
- **Concurrency:** SQLite allows only one writer at a time (file-level lock, even with WAL mode). The current codebase has 10+ transaction blocks -- concurrent API requests will cause `SQLITE_BUSY` errors that never happen on PostgreSQL.
- **LIKE operator:** PostgreSQL `LIKE` is case-sensitive by default; SQLite `LIKE` is case-insensitive for ASCII. If any search functionality is added, behavior will differ.
- **Boolean type:** SQLite has no native BOOLEAN; stores as 0/1. PostgreSQL has true/false. ORM layers usually handle this, but raw queries will differ.
- **JSON functions:** PostgreSQL JSONB has rich operators (`->>`, `@>`, `#>`). SQLite's `json_extract()` is more limited. Queries that work on PostgreSQL may not work on SQLite and vice versa.
- **Date handling:** SQLite stores dates as TEXT, REAL, or INTEGER with no native DATE type. PostgreSQL has timestamp, date, interval types with timezone support.

**Why it happens:**
Developers test against one database (usually SQLite in dev) and deploy to another (PostgreSQL in production). The ORM abstracts most differences but cannot abstract all of them, especially for queries involving JSON, dates, or type edge cases.

**How to avoid:**
1. Choose an ORM that abstracts SQL dialect differences well. Drizzle ORM supports both SQLite and PostgreSQL with the same schema definition language but generates dialect-specific SQL.
2. Run the full test suite against BOTH databases in CI -- never assume SQLite behavior matches PostgreSQL
3. Avoid raw SQL queries entirely; use the ORM's query builder for all operations
4. For JSON columns, define a minimal set of operations that both databases support and restrict queries to that set
5. Configure SQLite with `PRAGMA journal_mode=WAL` and `PRAGMA busy_timeout=5000` to mitigate concurrent write failures
6. Use the ORM's migration system to generate dialect-specific DDL, never hand-write CREATE TABLE statements

**Warning signs:**
- Tests passing on SQLite but failing on PostgreSQL (or vice versa)
- `SQLITE_BUSY` errors during concurrent API testing
- Import operations that succeed on PostgreSQL but silently corrupt data on SQLite due to type coercion
- Date comparisons returning wrong results on one database

**Phase to address:**
Phase 2 (Database Abstraction Layer) for schema design, and every subsequent phase must include cross-database testing.

---

### Pitfall 7: Removing Feishu Auth Without a Complete Replacement Leaves Auth Broken

**What goes wrong:**
The current auth system has two code paths: `login()` for local users and `loginWithFeishu()` for OAuth users. The `User` schema has Feishu-specific fields (`feishuId`, `feishuUnionId`, `loginProvider` enum). Simply deleting the Feishu code path without updating the schema, the frontend login flow, and the user creation logic will leave orphaned fields, broken enum constraints, and no way for existing Feishu users to access their accounts in a migrated deployment.

Additionally, the frontend login page (`packages/web/app/login/page.tsx`) likely has Feishu redirect logic, and the middleware (`packages/web/middleware.ts`) may have Feishu-specific routing.

**Why it happens:**
Auth systems are deeply integrated -- they touch the user model, the JWT payload, the frontend routing, and API middleware. Removing one auth provider is not a matter of deleting one method; it requires tracing every code path that checks `loginProvider` or references Feishu-specific fields.

**How to avoid:**
1. Map the complete auth flow: login page -> API call -> auth service -> JWT creation -> middleware validation -> protected routes
2. Remove Feishu fields from the user schema (`feishuId`, `feishuUnionId`) and change `loginProvider` to always be `'local'` or remove it entirely
3. Add username/password registration with proper validation (the `register()` method already exists but may need enhancement)
4. Implement a first-run admin setup (no users exist in a fresh deployment, so someone needs to be able to create the first account)
5. Ensure the JWT payload and token refresh logic work without any Feishu-specific data

**Warning signs:**
- Frontend login page still showing "Login with Feishu" button or redirect
- User schema migration failing because `feishuId` unique constraint conflicts with null values
- API returning 401 on all requests because middleware expects a token format that changed
- No way to create the first user account in a fresh deployment

**Phase to address:**
Phase 3 (Auth System Replacement) -- this must be a complete, tested replacement, not an incremental removal.

---

### Pitfall 8: File Upload CDN Replacement Breaks Existing Screenshot References

**What goes wrong:**
Tokens store CDN URLs in their `screenshots` field (e.g., `"screenshots": ["https://some-r2-bucket.example.com/abc.png"]`). When the QiLiangJia CDN is replaced with local file storage, all existing screenshot URLs become dead links. The `getImageUrl()` function in `upload.ts` has backward-compatibility logic but it assumes the API server can serve old URLs, which it cannot if the CDN is gone.

**Why it happens:**
File storage migrations are often treated as "just change the upload endpoint" but forget that existing data contains absolute URLs pointing to the old storage. This is a data migration problem, not just a code change.

**How to avoid:**
1. Implement a local file storage endpoint on the NestJS server (e.g., `POST /api/uploads` that saves to a configurable local directory or Docker volume)
2. Update `getImageUrl()` to proxy or redirect old CDN URLs through the server (if the old CDN is still accessible) or to serve local files
3. For new open-source deployments, this is a non-issue (no existing data). But document that migrating from the internal version requires a screenshot URL migration.
4. Store relative paths (e.g., `/uploads/abc.png`) instead of absolute URLs in the database so the storage backend can change without data migration

**Warning signs:**
- Broken image icons in the translation token UI
- `upload.ts` still referencing `qiliangjia.one` domain
- New uploads working but old screenshots showing 404

**Phase to address:**
Phase 3 (Service Replacement) for the upload endpoint, and Phase 2 (Database Design) for the URL storage strategy.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Using `any` for translation objects throughout the service layer (50+ occurrences of `Record<string, any>`) | Faster initial development | Type errors at runtime, impossible to validate data integrity during migration | Never in the open-source version -- define proper types for `TranslationMap` |
| Skipping input validation (no ValidationPipe, no DTOs with decorators) | Less boilerplate code | Malformed data enters the database, especially dangerous when switching databases | Only in internal prototype; must add validation before open-source release |
| Embedding `TokenHistory[]` as a sub-array inside Token documents | Simpler queries in MongoDB | History grows unbounded inside the token document; in relational DB, this becomes a serialized JSON blob that cannot be queried efficiently | Never in relational DB -- must be a separate table |
| `pnpm@latest` in Dockerfiles instead of pinned version | Always gets latest features | Non-reproducible builds; a pnpm update can break builds months later | Never in production Dockerfiles |
| Hardcoding fallback values in source code (JWT secret fallback, database URL fallback) | Works without `.env` in development | Insecure defaults deployed to production accidentally | Only if clearly marked as development-only with runtime warnings |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Dify AI translation API | Making it a hard dependency -- app crashes if Dify is unreachable | Wrap all AI calls in try/catch with graceful degradation. Return "translation unavailable" rather than 500 errors. Make the entire AI module conditionally loaded based on `DIFY_API_KEY` being set. |
| Local file storage (replacing CDN) | Storing files inside the container filesystem | Use Docker volumes mapped to host directories. Files inside containers are lost on restart. Add file size limits and type validation that the CDN previously handled. |
| PostgreSQL connection | Using the same connection string format as MongoDB | PostgreSQL connection strings use `postgresql://` prefix, different auth mechanisms, and different parameter names. The database module needs a complete rewrite, not a find-and-replace. |
| SQLite in Docker | Mounting SQLite database file from host | SQLite files must be on a volume with proper filesystem support. NFS-mounted SQLite databases can corrupt. Always use a local Docker volume, never a bind mount over network storage. |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| All `.populate()` calls loading full related documents | Slow API responses, high memory usage | Select only needed fields in populate (already done in some places: `'name email id avatar'`), add `lean()` for read-only queries | 50+ projects with 1000+ tokens each |
| No pagination on project listing (`findAllProjects` returns everything) | API timeout, browser tab crash | Add cursor-based or offset pagination to all list endpoints before open-source release | 100+ projects |
| Synchronous import processing on the request thread | HTTP request timeout during large imports | Move to background job processing; return job ID immediately | Import files > 5MB or 1000+ tokens |
| SQLite single-writer bottleneck | `SQLITE_BUSY` errors during concurrent requests | Configure `busy_timeout`, use WAL mode, batch writes, or recommend PostgreSQL for team deployments | 3+ concurrent users |
| Activity log unbounded growth | Database queries slow down, disk usage grows | Add TTL-based cleanup or archival. Consider separate table/database for logs. | 10,000+ activity log entries |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| JWT secret fallback to `'your-secret-key'` when env var is not set | Anyone can forge JWT tokens if deployer forgets to set `JWT_SECRET` | Refuse to start the server if `JWT_SECRET` is not set in production (`NODE_ENV=production`). Log a clear error message. |
| Super-admin check by email string comparison (`SUPER_ADMINS` array) | Hardcoded email grants admin privileges; if the email pattern leaks, attackers know the admin account | Replace with a database-level `isAdmin` flag set during first-run setup. Never check admin status by matching email strings. |
| No file type/size validation on uploads | Malicious file upload, storage exhaustion | Add MIME type whitelist (images only for screenshots), file size limit (5MB), and filename sanitization before saving to local storage |
| Token stored in `localStorage` (frontend) | XSS attack can steal auth tokens | For the open-source version, consider `httpOnly` cookies. At minimum, document the risk and set short token expiration. Current 15-day expiration is excessive for a self-hosted tool. |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No first-run setup wizard | User clones repo, runs `docker-compose up`, and has no way to create an account or team | Add a `/setup` page that appears when no users exist in the database. Creates admin account and first team. |
| Error messages in Chinese comments leaked to open-source users | Non-Chinese-speaking users see untranslated error messages or comments | Audit all user-facing strings. The codebase has Chinese comments throughout (e.g., `// 如果用户存在，则直接登录`). Backend error messages should be in English. |
| Docker-compose requiring manual MongoDB replica set initialization | The current `docker-compose.yml` uses `--replSet rs0` and requires `init-replica.js` -- complex for users | The new docker-compose must "just work" with SQLite (no extra services) or PostgreSQL (single service, no replica set). |
| Environment variable confusion between build-time and runtime | Next.js `NEXT_PUBLIC_*` vars are baked at build time; changing them after build has no effect | Document clearly which env vars are build-time vs runtime. For Docker, use build args for `NEXT_PUBLIC_*` vars. |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Auth system replacement:** Often missing first-run setup flow -- verify a fresh database with zero users can bootstrap an admin account
- [ ] **Database migration:** Often missing index creation -- verify that composite indexes (e.g., `projectId + createdAt` on ActivityLog) are recreated in the relational schema
- [ ] **Docker deployment:** Often missing health checks -- verify `docker-compose` has `healthcheck` on the database service so the app doesn't start before the DB is ready
- [ ] **File upload replacement:** Often missing existing data migration path -- verify documentation explains how to migrate screenshot URLs if coming from the internal version
- [ ] **Multi-database support:** Often missing cross-database CI -- verify the test suite runs on both SQLite and PostgreSQL, not just the developer's local database
- [ ] **Feishu removal:** Often missing frontend cleanup -- verify no Feishu logos, redirect URLs, or OAuth flow remnants exist in the web package
- [ ] **AI feature optionality:** Often missing graceful UI state -- verify the frontend hides AI translation buttons when `DIFY_API_KEY` is not configured, rather than showing buttons that error
- [ ] **Branding cleanup:** Often missing in i18n message files -- verify `zh-CN.json`, `en-US.json`, and SVG logo files do not contain company name or branding
- [ ] **Transaction handling:** Often missing SQLite compatibility -- verify transaction code does not assume multi-collection/multi-table atomic operations that SQLite handles differently

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Secrets leaked in git history | MEDIUM | Use BFG Repo Cleaner or `git filter-repo` to remove sensitive strings. Force-push the cleaned branch. Rotate any leaked API keys. Notify users who may have cloned. |
| MongoDB Mixed type data loss during migration | HIGH | Write a data export script from MongoDB that preserves the full JSON structure. Re-import to the relational database using JSONB columns. Cannot be fixed retroactively if data was already truncated to fit wrong column types. |
| Docker images containing secrets | MEDIUM | Rebuild images from clean source. Add `.dockerignore`. Scan images with `docker history` and `dive` tool. Delete and re-tag affected images on any registry. |
| SQLite busy errors in production | LOW | Switch to PostgreSQL. Migration path should be documented: export data as JSON, import to PostgreSQL. ORM abstraction layer makes this a configuration change if designed correctly. |
| Broken auth after Feishu removal | MEDIUM | Ensure local login always works. Add a "reset admin password" CLI command that can be run from inside the Docker container as an escape hatch. |
| Dead screenshot URLs after CDN removal | LOW | Write a one-time migration script that downloads images from old CDN URLs and re-uploads to local storage, updating database references. Document this as an optional migration step. |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Leaked secrets in git history | Phase 1: Branch Setup | Run `gitleaks detect` on the opensource branch; zero findings |
| Hardcoded internal references (team ID, emails, URLs) | Phase 1: Cleanup | `grep -r "qiliangjia\|feishu\|bondma\|680f557b" --include="*.ts"` returns zero results |
| MongoDB Mixed/Map type migration | Phase 2: Database Design | Schema review confirms JSONB columns for translations, details, languageLabels |
| `.populate()` chain translation to JOINs | Phase 2-3: Abstraction + Service Migration | Each service method has a passing test on both SQLite and PostgreSQL |
| SQLite vs PostgreSQL behavior differences | Phase 2: Database Abstraction | CI runs test suite against both databases on every PR |
| Feishu auth removal incomplete | Phase 3: Auth Replacement | Fresh deployment can register, login, create team, and manage projects without any Feishu configuration |
| Docker build context and caching issues | Phase 4: Docker Deployment | `docker-compose up` from a clean clone works in under 5 minutes; image size < 300MB each |
| CDN replacement and file storage | Phase 3: Service Replacement | Screenshot upload and display works with local storage; no external CDN references remain |
| First-run experience missing | Phase 4: Docker + UX Polish | `docker-compose up` followed by opening `localhost:3000` shows a setup wizard (not a blank login page) |
| AI features hard-crash when unconfigured | Phase 3: Service Replacement | Application starts and all core features work with `DIFY_API_KEY` unset; AI buttons are hidden in UI |

## Sources

- Codebase inspection: `packages/server/src/service/auth.service.ts`, `packages/server/src/utils/superAdmin.ts`, `packages/web/api/upload.ts`, all schema files in `packages/server/src/models/schemas/`
- [GitGuardian: Remediate Sensitive Data Leaks](https://www.gitguardian.com/glossary/remediate-sensitive-data-leaks-api-keys-hardcoded-source-code)
- [InfoQ: Thousands of Leaked Secrets in GitHub "Oops Commits"](https://www.infoq.com/news/2025/09/github-leaked-secrets/)
- [Jit: Developer's Guide to Gitleaks](https://www.jit.io/resources/appsec-tools/the-developers-guide-to-using-gitleaks-to-detect-hardcoded-secrets)
- [Medium: MongoDB to PostgreSQL Migration -- 3 Months, 2 Mental Breakdowns](https://medium.com/lets-code-future/mongodb-to-postgresql-migration-3-months-2-mental-breakdowns-1-lesson-2980110461a5)
- [TechBuddies: Top 7 PostgreSQL Migration Mistakes](https://www.techbuddies.io/2025/12/14/top-7-postgresql-migration-mistakes-developers-regret-later/)
- [Infisical: The Great Migration from MongoDB to PostgreSQL](https://infisical.com/blog/postgresql-migration-technical)
- [Coefficient: Migrating Data from MongoDB to PostgreSQL](https://coefficient.io/postgresql/migrate-mongodb-to-postgresql)
- [Docker Forums: Best Practices for NestJS + NextJS Monorepo](https://forums.docker.com/t/best-practices-for-using-docker-in-development-vs-production-nestjs-nextjs-monorepo/149461)
- [Twilio: SQLite or PostgreSQL? It's Complicated!](https://www.twilio.com/en-us/blog/sqlite-postgresql-complicated)
- [DataCamp: SQLite vs PostgreSQL Detailed Comparison](https://www.datacamp.com/blog/sqlite-vs-postgresql-detailed-comparison)
- [SitePoint: Post-PostgreSQL -- Is SQLite on the Edge Production Ready?](https://www.sitepoint.com/sqlite-edge-production-readiness-2026/)
- [DEV Community: Best ORM for NestJS in 2025](https://dev.to/sasithwarnakafonseka/best-orm-for-nestjs-in-2025-drizzle-orm-vs-typeorm-vs-prisma-229c)
- [Trilon: NestJS & DrizzleORM](https://trilon.io/blog/nestjs-drizzleorm-a-great-match)
- [BairesJDev: Pros and Cons of Open-Sourcing Your Project](https://www.bairesdev.com/blog/pros-and-cons-of-open-sourcing-your-project/)

---
*Pitfalls research for: qlj-i18n internal-to-open-source conversion*
*Researched: 2026-03-01*
