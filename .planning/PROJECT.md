# qlj-i18n Open Source Edition

## What This Is

An open-source, self-hosted internationalization (i18n) management platform for development teams. It provides a full-stack solution for managing translation tokens, multi-language content, team collaboration, and AI-assisted translation — built on Next.js + NestJS. This is the community edition derived from the internal qlj-fe-i18n platform, with all business-specific dependencies removed and deployment simplified.

## Core Value

Teams can self-host a complete i18n management platform with zero dependency on external proprietary services — just clone, configure, and run.

## Requirements

### Validated

<!-- Inferred from existing codebase — these capabilities already work -->

- ✓ JWT-based authentication with token refresh — existing
- ✓ Team creation and management — existing
- ✓ Role-based access control (owner/manager/member) — existing
- ✓ Project creation and configuration — existing
- ✓ Translation token CRUD with multi-language values — existing
- ✓ Token history tracking — existing
- ✓ Activity logging and audit trail — existing
- ✓ AI-assisted translation (via Dify) — existing
- ✓ AI-assisted token key generation — existing
- ✓ MCP server integration for Claude AI — existing
- ✓ File import/export (JSON, ZIP) — existing
- ✓ Frontend i18n (Chinese/English UI) — existing
- ✓ Responsive UI with Radix + Tailwind — existing

### Active

<!-- New requirements for open-source conversion -->

- [ ] Remove all Feishu OAuth login integration
- [ ] Built-in username/password authentication system
- [ ] Remove company branding, logos, and internal references
- [ ] Remove hardcoded business config (internal URLs, API keys, domain constants)
- [ ] Remove business-specific logic modules not relevant to OSS users
- [ ] Replace internal CDN (QiLiangJia CDN) with local/configurable file storage
- [ ] Docker and docker-compose based deployment
- [ ] SQLite support for quick-start (alongside existing MongoDB → switch to PostgreSQL)
- [ ] PostgreSQL support for production deployments
- [ ] Database abstraction layer to support SQLite and PostgreSQL
- [ ] Clear environment setup documentation
- [ ] Remove internal infrastructure dependencies
- [ ] Role-based access control (admin/member/viewer) for open-source users
- [ ] Team/organization management system (built-in, no Feishu dependency)
- [ ] Configurable AI translation backend (optional, not required to run)
- [ ] Multi-provider AI translation support (OpenAI, Claude, DeepL, Google Translate, etc.) — user provides their own API key
- [ ] CLI tool for developers (pull/push translations, sync with codebase)
- [ ] MCP server for AI coding assistants (enhance existing implementation for open-source use)

### Out of Scope

- Feishu integration of any kind — replaced by built-in auth
- Mobile app — web-first platform
- Real-time collaborative editing — complexity vs value tradeoff
- Multi-tenant SaaS features — this is a self-hosted tool
- Prisma migration — currently unused despite being in dependencies, keep Mongoose/new ORM approach

## Context

This is a brownfield conversion of an existing internal i18n platform. The current codebase is a pnpm monorepo with:
- **Frontend:** Next.js 15 + React 19 + Radix UI + Tailwind CSS + Jotai
- **Backend:** NestJS 11 + Mongoose + MongoDB + JWT auth
- **External deps to remove:** Feishu OAuth, QiLiangJia CDN, Dify AI (make optional)
- **Database shift:** MongoDB → PGlite (dev) + PostgreSQL (prod) via Drizzle ORM (research finding: PGlite shares same schema as PostgreSQL, eliminating dual-schema problem)

The conversion will happen on a git worktree branch (`opensource`) in the same repository, allowing parallel development of internal and open-source versions.

Key codebase locations:
- Auth system: `packages/server/src/service/auth.service.ts`, `packages/web/lib/auth/`
- Feishu integration: `packages/server/src/service/auth.service.ts` (`loginWithFeishu`)
- CDN upload: `packages/web/api/upload.ts`
- Database: `packages/server/src/modules/database.module.ts`, `packages/server/src/models/`
- Business config: `.env` files, hardcoded URLs throughout

## Constraints

- **Git structure**: Must use git worktree on a new `opensource` branch — not a fork or separate repo
- **Database**: Must support both SQLite (quick start) and PostgreSQL (production)
- **Auth**: Username/password only — no OAuth, no email verification
- **Deployment**: Must work with `docker-compose up` for a complete environment
- **AI features**: Must be optional — platform runs without any AI service configured
- **Backward compat**: Internal version on `master` must remain unaffected

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Git worktree branch over fork | Keep both versions in same repo for easier cherry-picking | — Pending |
| Username/password auth over OAuth | Simplest path for self-hosted users, no external dependencies | — Pending |
| SQLite + PostgreSQL over MongoDB | Lower barrier to entry (SQLite), production-ready (PostgreSQL), both relational | — Pending |
| Docker-compose deployment | Industry standard for self-hosted tools, one command to start | — Pending |
| Make AI features optional | Not everyone has Dify/AI API access, core i18n should work standalone | — Pending |
| PGlite over SQLite for dev | Same PostgreSQL schema in dev and prod, no dual-schema maintenance (research finding) | — Pending |
| Drizzle ORM over Prisma/TypeORM | Fastest Node.js ORM, 7kb bundle, first-class PGlite + PostgreSQL support | — Pending |
| Multi-provider AI with user API keys | Users bring their own keys for OpenAI/Claude/DeepL/Google Translate | — Pending |

---
*Last updated: 2026-03-01 after initialization + user additions (multi-provider AI, CLI, MCP)*
