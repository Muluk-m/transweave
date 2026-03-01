# Requirements: qlj-i18n Open Source Edition

**Defined:** 2026-03-01
**Core Value:** Teams can self-host a complete i18n management platform with zero dependency on external proprietary services

## v1 Requirements

Requirements for initial open-source release. Each maps to roadmap phases.

### Cleanup

- [ ] **CLEAN-01**: All Feishu OAuth code removed from backend and frontend
- [ ] **CLEAN-02**: All company branding, logos, and internal product names removed
- [ ] **CLEAN-03**: All hardcoded internal URLs (qiliangjia.org, qiliangjia.one) removed or replaced
- [ ] **CLEAN-04**: All hardcoded business config (internal API keys, MongoDB ObjectIds, emails) removed
- [ ] **CLEAN-05**: Business-specific logic modules not relevant to OSS users removed
- [ ] **CLEAN-06**: Clean orphan git branch created with no secret/business data in history
- [ ] **CLEAN-07**: .gitignore updated to exclude .env files, .dockerignore created
- [ ] **CLEAN-08**: Secret scan passes with zero findings (gitleaks or equivalent)

### Authentication

- [ ] **AUTH-01**: User can register with username and password
- [ ] **AUTH-02**: User can log in with username and password and receive JWT token
- [ ] **AUTH-03**: User session persists across browser refresh via stored JWT
- [ ] **AUTH-04**: User can log out from any page
- [ ] **AUTH-05**: First-run setup wizard creates initial admin user and team when database is empty
- [ ] **AUTH-06**: Admin can reset any user's password

### Users & Teams

- [ ] **TEAM-01**: User can create teams
- [ ] **TEAM-02**: Team owner can invite members to team
- [ ] **TEAM-03**: Team supports role-based access: owner, manager, member
- [ ] **TEAM-04**: Team owner/manager can change member roles
- [ ] **TEAM-05**: Team owner/manager can remove members from team
- [ ] **TEAM-06**: User can view and switch between their teams

### Database

- [ ] **DB-01**: All data models migrated from Mongoose/MongoDB to Drizzle ORM with PostgreSQL schema
- [ ] **DB-02**: PGlite works as zero-config development/quick-start database
- [ ] **DB-03**: PostgreSQL works as production database
- [ ] **DB-04**: Database driver selected automatically based on DATABASE_URL environment variable
- [ ] **DB-05**: Database migrations managed via drizzle-kit
- [ ] **DB-06**: Repository abstraction layer isolates all database operations from service logic

### File Storage

- [ ] **FILE-01**: File uploads stored on local disk (replacing external CDN)
- [ ] **FILE-02**: Uploaded files served via built-in static file server
- [ ] **FILE-03**: Screenshot/image attachment on translation tokens uses local storage
- [ ] **FILE-04**: Upload directory path configurable via environment variable

### Translation Core

- [ ] **TRANS-01**: User can create translation tokens with multi-language values
- [ ] **TRANS-02**: User can edit translation token keys and values
- [ ] **TRANS-03**: User can delete translation tokens
- [ ] **TRANS-04**: User can organize tokens by modules/namespaces
- [ ] **TRANS-05**: User can view token change history
- [ ] **TRANS-06**: Translation progress shown as per-language completion percentage per project
- [ ] **TRANS-07**: User can add comments/notes on individual translation tokens
- [ ] **TRANS-08**: User can bulk delete, bulk status change, and bulk tag translations

### Search & Filter

- [ ] **SRCH-01**: User can full-text search across token keys and translation values
- [ ] **SRCH-02**: User can filter translations by language completion status (translated/untranslated)
- [ ] **SRCH-03**: User can filter translations by module/namespace

### Import & Export

- [ ] **IMEX-01**: User can import translations from JSON files
- [ ] **IMEX-02**: User can import translations from YAML files
- [ ] **IMEX-03**: User can import translations from XLIFF files
- [ ] **IMEX-04**: User can import translations from Gettext (.po) files
- [ ] **IMEX-05**: User can export translations in JSON, YAML, CSV, XLIFF, and Gettext formats
- [ ] **IMEX-06**: Import preview shows diff of changes before applying

### AI Translation

- [ ] **AI-01**: User can configure AI translation provider (OpenAI, Claude, DeepL, Google Translate, etc.)
- [ ] **AI-02**: User provides their own API key for the selected AI provider
- [ ] **AI-03**: User can trigger AI translation for individual tokens or batch of tokens
- [ ] **AI-04**: AI translation is optional — platform runs fully without any AI provider configured
- [ ] **AI-05**: AI provider configuration stored per team or per project

### Developer Tools

- [ ] **DEV-01**: CLI tool can pull translations from server to local files (qlj-i18n pull)
- [ ] **DEV-02**: CLI tool can push local translation files to server (qlj-i18n push)
- [ ] **DEV-03**: CLI authenticates via API key
- [ ] **DEV-04**: User can generate and manage API keys from the web UI
- [ ] **DEV-05**: MCP server allows AI coding assistants to list projects and tokens
- [ ] **DEV-06**: MCP server allows AI coding assistants to create and update tokens
- [ ] **DEV-07**: REST API documented with endpoint reference

### Deployment

- [ ] **DEPL-01**: Application runs via docker-compose up with PostgreSQL
- [ ] **DEPL-02**: Application runs without Docker using PGlite (zero-config quick-start)
- [ ] **DEPL-03**: .env.example documents all required and optional environment variables
- [ ] **DEPL-04**: Docker health checks ensure services start in correct order
- [ ] **DEPL-05**: Data persists across container restarts via Docker volumes
- [ ] **DEPL-06**: README with clear setup instructions for both Docker and local development

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Translation Memory

- **TM-01**: System stores translation pairs for reuse
- **TM-02**: Fuzzy matching suggests similar past translations

### Webhooks

- **HOOK-01**: Admin can configure webhooks for translation events
- **HOOK-02**: Webhooks fire on translation update, import complete, project changes

### Additional Formats

- **FMT-01**: Android XML import/export
- **FMT-02**: iOS Strings import/export
- **FMT-03**: Flutter ARB import/export

### Advanced AI

- **AI-06**: AI key generation from context (currently exists but enhance)
- **AI-07**: Support self-hosted LLMs (Ollama, vLLM) as translation provider

### Glossary

- **GLOSS-01**: Per-project glossary of approved terms
- **GLOSS-02**: AI translation references glossary for consistency

## Out of Scope

| Feature | Reason |
|---------|--------|
| Feishu integration | Replaced by built-in auth — proprietary dependency |
| Real-time collaborative editing | High complexity (CRDT/OT), no competitor does it well |
| Multi-tenant SaaS mode | This is a self-hosted tool, not a SaaS product |
| Mobile native app | Responsive web UI works on mobile browsers |
| Over-the-air translation delivery | Essentially a separate product with CDN infrastructure |
| In-context editing SDK | Very high complexity, requires per-framework packages (v2+ consideration) |
| Branching/versioning | Adds significant schema complexity (v2+ consideration) |
| Email verification / password reset via email | Requires SMTP config, adds deployment complexity |
| 50+ file format support | Diminishing returns — top 6-8 formats cover 80% of users |
| Public crowdsource translation portal | Different user persona, moderation complexity |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CLEAN-01 | — | Pending |
| CLEAN-02 | — | Pending |
| CLEAN-03 | — | Pending |
| CLEAN-04 | — | Pending |
| CLEAN-05 | — | Pending |
| CLEAN-06 | — | Pending |
| CLEAN-07 | — | Pending |
| CLEAN-08 | — | Pending |
| AUTH-01 | — | Pending |
| AUTH-02 | — | Pending |
| AUTH-03 | — | Pending |
| AUTH-04 | — | Pending |
| AUTH-05 | — | Pending |
| AUTH-06 | — | Pending |
| TEAM-01 | — | Pending |
| TEAM-02 | — | Pending |
| TEAM-03 | — | Pending |
| TEAM-04 | — | Pending |
| TEAM-05 | — | Pending |
| TEAM-06 | — | Pending |
| DB-01 | — | Pending |
| DB-02 | — | Pending |
| DB-03 | — | Pending |
| DB-04 | — | Pending |
| DB-05 | — | Pending |
| DB-06 | — | Pending |
| FILE-01 | — | Pending |
| FILE-02 | — | Pending |
| FILE-03 | — | Pending |
| FILE-04 | — | Pending |
| TRANS-01 | — | Pending |
| TRANS-02 | — | Pending |
| TRANS-03 | — | Pending |
| TRANS-04 | — | Pending |
| TRANS-05 | — | Pending |
| TRANS-06 | — | Pending |
| TRANS-07 | — | Pending |
| TRANS-08 | — | Pending |
| SRCH-01 | — | Pending |
| SRCH-02 | — | Pending |
| SRCH-03 | — | Pending |
| IMEX-01 | — | Pending |
| IMEX-02 | — | Pending |
| IMEX-03 | — | Pending |
| IMEX-04 | — | Pending |
| IMEX-05 | — | Pending |
| IMEX-06 | — | Pending |
| AI-01 | — | Pending |
| AI-02 | — | Pending |
| AI-03 | — | Pending |
| AI-04 | — | Pending |
| AI-05 | — | Pending |
| DEV-01 | — | Pending |
| DEV-02 | — | Pending |
| DEV-03 | — | Pending |
| DEV-04 | — | Pending |
| DEV-05 | — | Pending |
| DEV-06 | — | Pending |
| DEV-07 | — | Pending |
| DEPL-01 | — | Pending |
| DEPL-02 | — | Pending |
| DEPL-03 | — | Pending |
| DEPL-04 | — | Pending |
| DEPL-05 | — | Pending |
| DEPL-06 | — | Pending |

**Coverage:**
- v1 requirements: 55 total
- Mapped to phases: 0
- Unmapped: 55

---
*Requirements defined: 2026-03-01*
*Last updated: 2026-03-01 after initial definition*
