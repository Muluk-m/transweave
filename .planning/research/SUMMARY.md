# Project Research Summary

**Project:** qlj-i18n open-source conversion
**Domain:** Self-hosted i18n/translation management platform
**Researched:** 2026-03-01
**Confidence:** HIGH

## Executive Summary

This project converts an internal i18n management platform from MongoDB to a relational database (PGlite for quick-start, PostgreSQL for production) and removes proprietary dependencies to create an open-source self-hosted tool. The research reveals a clear architectural path: replace MongoDB with Drizzle ORM using a repository pattern, remove Feishu OAuth in favor of username/password auth, replace external CDN with local file storage, and containerize everything with Docker Compose. The codebase already has strong foundations (NestJS backend, Next.js frontend, MCP integration, AI-assisted features) that differentiate it from competitors like Tolgee and Weblate.

The critical path is database migration first (Phases 1-2), followed by removing proprietary integrations (Phase 3), then Docker deployment (Phase 4). The highest risks are: git history containing secrets/internal references that must be cleaned before creating the opensource branch, MongoDB's schemaless Mixed types requiring careful JSONB column design, and SQLite/PostgreSQL behavioral differences requiring cross-database testing throughout development.

The recommended stack is PGlite (not SQLite) for development because it uses the same PostgreSQL dialect as production, eliminating dual-schema maintenance. This is a validated pattern supported by Drizzle ORM and makes the "zero-config quick-start" experience work without Docker while guaranteeing production parity.

## Key Findings

### Recommended Stack

**Critical decision:** Use **PGlite + PostgreSQL** (both PostgreSQL dialect), not SQLite + PostgreSQL. SQLite would require maintaining two separate schema files (`sqliteTable` vs `pgTable` in Drizzle), doubling migration effort and introducing drift risk. PGlite is a 3MB WASM PostgreSQL that shares the exact same schema as production, needs no Docker for quick-start, and has first-class Drizzle support.

**Core technologies:**
- **Drizzle ORM 0.45.x:** Replaces Mongoose. Fastest NestJS ORM in 2025 (7kb bundle), TypeScript-first, SQL-transparent. Supports both PGlite and PostgreSQL with identical schema.
- **PGlite 0.3.x:** Embedded WASM PostgreSQL for development/quick-start. Zero Docker requirement. Same `pgTable` schema as production.
- **PostgreSQL 17:** Production database. Industry standard relational DB. Docker image: `postgres:17-alpine`.
- **NestJS 11.x + Next.js 15.x:** Keep existing stack. No reason to change. Already well-architected.
- **Local file storage (@nestjs/serve-static):** Replaces QiLiangJia CDN. Serve `./uploads` directory as static files.

**Remove entirely:**
- Mongoose and @nestjs/mongoose (MongoDB-specific)
- @prisma/client (unused dead dependency)
- Feishu SDK/OAuth (proprietary third-party)
- External CDN dependencies

### Expected Features

**Must have (table stakes):**
- Translation key CRUD with multi-language values (already exists)
- Project/team organization with RBAC (already exists)
- File import/export (JSON, YAML, CSV, XLIFF, Gettext) — expand current formats
- Docker/docker-compose deployment — one-command startup for self-hosted
- Username/password authentication — replace Feishu OAuth
- Translation progress tracking — per-language completion visibility
- Full-text search with filters — usable at 1000+ keys
- REST API with API keys — enable automation/CI/CD
- Activity/audit logging (already exists)

**Should have (competitive advantage):**
- AI-assisted translation (multi-provider) — already exists via Dify, make provider-agnostic
- AI-assisted key generation — already exists, unique to this platform
- MCP server for AI coding assistants — already exists, differentiator over Weblate/Traduora
- Module/namespace organization — already exists
- Import preview/diff — already exists, uncommon feature
- CLI tool for CI/CD integration — build after API stabilizes (v1.x)
- Translation memory — v1.x feature
- Webhook support — v1.x feature

**Defer (v2+):**
- In-context editing SDK (Tolgee's flagship, very high complexity)
- Branching/versioning (enterprise feature, adds schema complexity)
- Over-the-air translation delivery (separate product, SaaS concern)
- Multi-tenant SaaS mode (out of scope per PROJECT.md)

### Architecture Approach

The migration requires a **repository abstraction layer** between services and the database. Services currently use Mongoose directly; they must be refactored to call repository methods instead. The repository layer isolates all Drizzle/SQL code, enabling testability and making the database swappable. This is the key architectural pattern enabling dual-database support.

**Major components:**
1. **Database Layer (new):** Drizzle schema definitions + conditional driver provider (PGlite vs PostgreSQL based on env)
2. **Repository Layer (new):** Abstracts all database operations. Services call repositories, never Drizzle directly.
3. **Service Layer (modified):** Remove all `@InjectModel` and Mongoose imports. Delegates to repositories.
4. **Auth Module (rewritten):** Remove Feishu OAuth. Simple username/password + JWT. Add first-run setup flow.
5. **File Storage Module (new):** Local disk uploads with Multer + static serving via @nestjs/serve-static.
6. **Docker Compose:** Three services (web, server, db). Health checks, volume mounts for uploads and PostgreSQL data.

**Critical patterns:**
- MongoDB's `Schema.Types.Mixed` fields (translations, activity details) map to PostgreSQL `JSONB` columns for queryability
- SQLite uses `TEXT` columns with JSON functions (SQLite 3.38+ supports `json_extract`)
- Normalize embedded arrays: `TokenHistory` becomes a separate table with foreign key to tokens
- All `.populate()` chains must be rewritten as explicit JOIN queries or separate queries with `IN()` clauses

### Critical Pitfalls

1. **Leaked secrets in git history** — The current codebase contains hardcoded MongoDB ObjectIds, internal emails (`maqiqian@qiliangjia.com`), team IDs (`680f557b932fa3656cbae929`), internal CDN URLs, and a `.env` file NOT covered by `.gitignore`. These remain in git history even when removed from source. **Prevention:** Create opensource branch as an orphan branch (`git checkout --orphan opensource`) with clean initial commit. Run `gitleaks detect` before and after. Add `.env` to `.gitignore` immediately.

2. **MongoDB Mixed types have no direct relational equivalent** — Token translations stored as `Record<string, any>`, activity log details, and project language labels use schemaless MongoDB patterns. Attempting to normalize these into relational tables creates JOIN explosion; dumping to TEXT loses queryability. **Prevention:** Use PostgreSQL JSONB columns with GIN indexes. For SQLite, use TEXT with JSON functions. Consider hybrid: normalized `translation` table for writes + JSONB snapshot for reads.

3. **SQLite and PostgreSQL behave differently** — Type coercion (SQLite accepts `"42"` in INTEGER), concurrency (SQLite single-writer causes `SQLITE_BUSY`), LIKE case-sensitivity, boolean storage (0/1 vs true/false), JSON operators, date handling. **Prevention:** Run full test suite against BOTH databases in CI. Use ORM query builder exclusively (no raw SQL). Configure SQLite with WAL mode and busy_timeout. Recommend PostgreSQL for production in docs.

4. **Hardcoded internal team ID breaks all new deployments** — `auth.service.ts:154` hardcodes a MongoDB ObjectId for auto-joining new users. This reference becomes meaningless when switching to UUID/auto-increment primary keys. **Prevention:** Remove hardcoded ID. Implement first-run setup flow that creates initial admin user and team. Add database seed mechanism.

5. **Docker build context copies entire monorepo** — No `.dockerignore` exists. Every build sends entire monorepo including `node_modules`, `.git`, and `.env` to Docker daemon. Slow builds, secrets leaking into images. `Dockerfile.server:13` has typo: `--frozen-lockfil` (missing `e`). **Prevention:** Create `.dockerignore` excluding node_modules, .git, .next, dist, .env*. Pin pnpm version. Fix typo. Add health checks to docker-compose.

## Implications for Roadmap

Based on research, the migration must follow strict dependency order. Database foundation must be complete before touching services. Services must work before removing auth/file dependencies. Everything must work before containerizing.

### Phase 1: Repository Setup & Secret Cleanup
**Rationale:** Must be first. Creating the opensource branch with leaked secrets or internal references is unrecoverable without force-pushing history rewrites. This phase is pure preparation — no functional changes.

**Delivers:**
- Clean opensource branch (orphan, no inherited history)
- Audit and removal of all internal references (qiliangjia, feishu, bondma, hardcoded IDs/emails/URLs)
- `.gitignore` updated to exclude `.env` files
- `.dockerignore` created
- Secret scanning verification (gitleaks returns zero findings)

**Addresses:**
- Pitfall 1 (leaked secrets)
- Pitfall 4 (hardcoded team ID)
- Partial Pitfall 5 (.dockerignore)

**Avoids:** Starting development only to discover later that git history must be rewritten, breaking all contributor clones.

**Research flag:** No additional research needed (cleanup work).

---

### Phase 2: Database Foundation
**Rationale:** Everything depends on the data layer. Cannot modify services until schemas and repositories exist. This phase establishes the core architecture that makes dual-database support possible.

**Delivers:**
- Drizzle schema definitions (PostgreSQL dialect, shared for PGlite and PostgreSQL)
- Migration files via drizzle-kit
- DrizzleModule + conditional provider (PGlite vs PostgreSQL based on DATABASE_URL env)
- Base repository pattern established
- All 7 repositories implemented (User, Team, Membership, Project, Token, TokenHistory, ActivityLog)

**Uses:**
- Drizzle ORM 0.45.x + drizzle-kit 0.31.x
- PGlite 0.3.x for development
- postgres.js 3.4.x for production PostgreSQL driver

**Implements:**
- Repository abstraction layer (ARCHITECTURE.md Pattern 1)
- Conditional database driver pattern (ARCHITECTURE.md Pattern 2)
- JSONB columns for MongoDB Mixed types (addresses Pitfall 2)

**Addresses:**
- Pitfall 2 (MongoDB Mixed type migration — critical design decision)
- Pitfall 3 (SQLite/PostgreSQL differences — mitigated by using PGlite instead of SQLite)

**Avoids:** Dual-schema maintenance burden (PGlite uses same pgTable as PostgreSQL).

**Research flag:** No additional research needed (stack research comprehensive).

---

### Phase 3: Service Layer Migration
**Rationale:** With repositories built, services can be migrated one at a time. Each service is tested independently against both PGlite and PostgreSQL before moving to the next. This is the largest phase in terms of code changes but follows a mechanical pattern.

**Delivers:**
- All services refactored to use repositories instead of Mongoose
- All `@InjectModel` and Mongoose imports removed
- MongooseService, database.module.ts, and schema files deleted
- `.populate()` chains rewritten as JOIN queries or separate queries
- Aggregate pipelines (activity-log.service.ts) rewritten as native SQL
- Transaction handling migrated from Mongoose sessions to Drizzle transactions

**Implements:**
- ARCHITECTURE.md Phase 2 (Service Migration)
- Repository pattern for all entities

**Addresses:**
- Pitfall 3 (populate chain translation to JOINs)
- Partial Pitfall 2 (verifies JSONB design works in practice)

**Avoids:** N+1 query patterns by using explicit JOINs where appropriate.

**Research flag:** No additional research needed (patterns established in Phase 2).

---

### Phase 4: Proprietary Dependency Removal
**Rationale:** With the database layer working, now remove Feishu OAuth and CDN dependencies. These are isolated changes that don't affect the core data layer.

**Delivers:**
- Feishu OAuth removed from AuthService and AuthController
- `feishuId`, `feishuUnionId` fields removed from User schema
- Local username/password registration and login working
- First-run setup flow (creates initial admin user when database is empty)
- FileStorageService with Multer + local disk storage
- UploadController (POST /api/uploads and GET /api/uploads/:filename)
- Frontend upload API updated to use local server
- Token schema updated to store relative paths instead of CDN URLs
- @nestjs/serve-static configured to serve uploads directory

**Implements:**
- ARCHITECTURE.md Pattern 3 (local file storage)
- ARCHITECTURE.md Pattern 4 (pluggable auth)

**Addresses:**
- Pitfall 7 (incomplete Feishu removal)
- Pitfall 8 (CDN replacement breaking screenshots)

**Avoids:** Broken auth state, dead screenshot URLs, deployers unable to create first admin account.

**Research flag:** No additional research needed (NestJS file upload is well-documented).

---

### Phase 5: Docker Deployment & Production Readiness
**Rationale:** With all application code working, containerize and add production infrastructure. This wraps everything into a deployable package.

**Delivers:**
- docker-compose.yml with three services (web, server, postgres)
- docker-compose.pglite.yml override for PGlite-only mode (no postgres service)
- Multi-stage Dockerfiles for web and server (optimized for monorepo with pnpm)
- Health checks on postgres service
- Volume mounts for uploads and PostgreSQL data
- .env.example with all configuration variables
- Drizzle migration step in server entrypoint
- CI configuration (GitHub Actions) running tests on both PGlite and PostgreSQL

**Implements:**
- ARCHITECTURE.md Phase 5 (Docker Deployment)
- Docker network architecture from ARCHITECTURE.md

**Addresses:**
- Pitfall 5 (Docker build context issues — completed)
- Pitfall 3 (cross-database testing in CI)
- Pitfall 6 (first-run UX via docker-compose)

**Avoids:** Non-reproducible builds, missing health checks causing race conditions, secrets baked into images.

**Research flag:** No additional research needed (Docker patterns established in STACK.md).

---

### Phase Ordering Rationale

The dependency graph is linear with one branch:

```
Phase 1 (Setup) → Phase 2 (Database) → Phase 3 (Services)
                                              ↓
                    Phase 4 (Auth/Files) ← ←  ← (can start in parallel with Phase 3)
                           ↓
                    Phase 5 (Docker)
```

- **Phase 1 must be first:** Cleaning git history after development has started requires rewriting history and breaking contributor work.
- **Phase 2 must precede Phase 3:** Services cannot be migrated until repositories exist.
- **Phase 4 can partially overlap with Phase 3:** Auth and file storage are isolated. However, database schema changes (removing Feishu fields) depend on Phase 3 completion.
- **Phase 5 must be last:** Cannot containerize until all application code works.

**Key insight from research:** Using PGlite instead of SQLite eliminates the dual-schema problem identified in STACK.md and PITFALLS.md. This dramatically reduces Phase 2 complexity and removes an entire class of pitfalls (schema drift between dev and prod databases).

### Research Flags

**Phases with standard patterns (skip research-phase):**
- **Phase 1:** Cleanup work, no technical research needed
- **Phase 2:** Stack research already comprehensive. Drizzle + PGlite patterns are well-documented.
- **Phase 3:** Mechanical refactoring following patterns established in Phase 2
- **Phase 5:** Docker patterns established in STACK.md research

**Phases that MAY need targeted research during implementation:**
- **Phase 4 (Auth first-run flow):** Standard pattern but PROJECT.md doesn't specify UX. May need quick research on setup wizard patterns (e.g., Weblate, Tolgee onboarding). LOW priority — can design based on common patterns.

**No phases require `/gsd:research-phase` during planning.** All critical architecture decisions are resolved in this project research.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | Drizzle ORM official docs, PGlite integration verified in GitHub discussions, NestJS patterns from official consulting partner (Trilon). All version numbers verified from npm registry. |
| Features | **MEDIUM-HIGH** | Based on analysis of 7 competitor platforms (Tolgee, Weblate, Traduora, Crowdin, Lokalise, Localazy, SimpleLocalize). Table stakes features are consistent across all platforms. Differentiators verified from codebase inspection (MCP, AI key generation, import preview already exist). |
| Architecture | **MEDIUM** | NestJS + Drizzle integration patterns from community articles (Trilon, Medium). Repository pattern is standard but specific implementation for this monorepo is inferred. Confidence increased by fact that Drizzle officially supports both PGlite and PostgreSQL with same API. |
| Pitfalls | **HIGH** | Based on codebase inspection (38 files with internal references found via grep, hardcoded IDs verified in auth.service.ts), verified community patterns (MongoDB to PostgreSQL migrations from Infisical, Medium case studies), and official Docker/SQLite documentation. All pitfalls grounded in actual code findings, not speculation. |

**Overall confidence:** **HIGH**

The critical architecture decision (PGlite vs SQLite) is supported by official Drizzle ORM documentation and GitHub discussions. The migration path is validated by multiple successful MongoDB-to-PostgreSQL case studies. The feature set is grounded in competitor analysis. Pitfalls are discovered via actual codebase inspection, not hypothetical.

### Gaps to Address

**Database schema validation:** The research assumes MongoDB Mixed types can be cleanly mapped to JSONB. This is standard practice (verified in Infisical case study) but the specific structure of `Token.translations` and `ActivityLog.details` should be validated in Phase 2 by manually inspecting production MongoDB data shape. **Mitigation:** Export sample data from MongoDB, verify JSONB schema preserves all fields.

**Import/export format compatibility:** Current system exports JSON/YAML/CSV/XML. Research recommends adding XLIFF and Gettext as table stakes. The implementation complexity for XLIFF parsing is unknown. **Mitigation:** Can defer XLIFF to v1.x if parsing complexity is high; JSON + YAML + CSV are sufficient for MVP.

**AI provider abstraction:** Current code integrates Dify specifically. Making this provider-agnostic (OpenAI, DeepL, Google, self-hosted LLMs) requires defining a provider interface and adapter pattern. **Mitigation:** Can ship v1 with Dify only, add provider abstraction in v1.x based on user requests.

**First-run UX design:** Research recommends setup wizard but doesn't specify UX. **Mitigation:** Design during Phase 4 based on Weblate/Tolgee patterns. Simple form: admin email + password + team name.

## Sources

### Primary (HIGH confidence)
- [Drizzle ORM Official Docs](https://orm.drizzle.team/) — Schema declaration, PGlite integration, migration patterns
- [Drizzle ORM GitHub Discussion #3396](https://github.com/drizzle-team/drizzle-orm/discussions/3396) — PGlite as SQLite alternative
- [PGlite Official Site](https://pglite.dev/) — Embedded PostgreSQL capabilities
- [NestJS Official Docs](https://docs.nestjs.com/) — File upload, serve static, database integration
- [Trilon - NestJS & DrizzleORM](https://trilon.io/blog/nestjs-drizzleorm-a-great-match) — Official NestJS consulting partner's integration guide
- [Tolgee GitHub](https://github.com/tolgee/tolgee-platform) — Competitor feature analysis
- [Weblate Features](https://weblate.org/en/features/) — Competitor feature analysis
- Codebase inspection — 38 files with internal references, hardcoded IDs in auth.service.ts, schema analysis

### Secondary (MEDIUM confidence)
- [Medium: MongoDB to PostgreSQL Migration](https://medium.com/lets-code-future/mongodb-to-postgresql-migration-3-months-2-mental-breakdowns-1-lesson-2980110461a5) — Migration patterns and pitfalls
- [Infisical: PostgreSQL Migration Technical](https://infisical.com/blog/postgresql-migration-technical) — Mixed type handling case study
- [TechBuddies: Top 7 PostgreSQL Migration Mistakes](https://www.techbuddies.io/2025/12/14/top-7-postgresql-migration-mistakes-developers-regret-later/) — Common pitfalls
- [DEV Community: Best ORM for NestJS 2025](https://dev.to/sasithwarnakafonseka/best-orm-for-nestjs-in-2025-drizzle-orm-vs-typeorm-vs-prisma-229c) — ORM comparison
- [DataCamp: SQLite vs PostgreSQL](https://www.datacamp.com/blog/sqlite-vs-postgresql-detailed-comparison) — Behavioral differences
- [Docker Forums: NestJS + NextJS Monorepo](https://forums.docker.com/t/best-practices-for-using-docker-in-development-vs-production-nestjs-nextjs-monorepo/149461) — Docker patterns

### Tertiary (LOW confidence)
- [GitGuardian: Remediate Sensitive Data Leaks](https://www.gitguardian.com/glossary/remediate-sensitive-data-leaks-api-keys-hardcoded-source-code) — Secret detection patterns
- [Jit: Developer's Guide to Gitleaks](https://www.jit.io/resources/appsec-tools/the-developers-guide-to-using-gitleaks-to-detect-hardcoded-secrets) — Secret scanning tools
- Community articles on namespace patterns, CLI patterns, translation memory implementation

---
*Research completed: 2026-03-01*
*Ready for roadmap: yes*
