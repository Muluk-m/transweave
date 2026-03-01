# Requirements: qlj-i18n Open Source Edition

**Defined:** 2026-03-01
**Core Value:** Teams can self-host a complete i18n management platform with zero dependency on external proprietary services

## v1 Requirements

Requirements for initial open-source release. Each maps to roadmap phases.

### Cleanup

- [x] **CLEAN-01**: All Feishu OAuth code removed from backend and frontend
- [x] **CLEAN-02**: All company branding, logos, and internal product names removed
- [x] **CLEAN-03**: All hardcoded internal URLs (qiliangjia.org, qiliangjia.one) removed or replaced
- [x] **CLEAN-04**: All hardcoded business config (internal API keys, MongoDB ObjectIds, emails) removed
- [x] **CLEAN-05**: Business-specific logic modules not relevant to OSS users removed
- [x] **CLEAN-06**: Clean orphan git branch created with no secret/business data in history
- [x] **CLEAN-07**: .gitignore updated to exclude .env files, .dockerignore created
- [x] **CLEAN-08**: Secret scan passes with zero findings (gitleaks or equivalent)

### Authentication

- [x] **AUTH-01**: User can register with username and password
- [x] **AUTH-02**: User can log in with username and password and receive JWT token
- [x] **AUTH-03**: User session persists across browser refresh via stored JWT
- [x] **AUTH-04**: User can log out from any page
- [x] **AUTH-05**: First-run setup wizard creates initial admin user and team when database is empty
- [x] **AUTH-06**: Admin can reset any user's password

### Users & Teams

- [x] **TEAM-01**: User can create teams
- [x] **TEAM-02**: Team owner can invite members to team
- [x] **TEAM-03**: Team supports role-based access: owner, manager, member
- [x] **TEAM-04**: Team owner/manager can change member roles
- [x] **TEAM-05**: Team owner/manager can remove members from team
- [ ] **TEAM-06**: User can view and switch between their teams

### Database

- [x] **DB-01**: All data models migrated from Mongoose/MongoDB to Drizzle ORM with PostgreSQL schema
- [x] **DB-02**: PGlite works as zero-config development/quick-start database
- [x] **DB-03**: PostgreSQL works as production database
- [x] **DB-04**: Database driver selected automatically based on DATABASE_URL environment variable
- [x] **DB-05**: Database migrations managed via drizzle-kit
- [x] **DB-06**: Repository abstraction layer isolates all database operations from service logic

### File Storage

- [x] **FILE-01**: File uploads stored on local disk (replacing external CDN)
- [x] **FILE-02**: Uploaded files served via built-in static file server
- [x] **FILE-03**: Screenshot/image attachment on translation tokens uses local storage
- [x] **FILE-04**: Upload directory path configurable via environment variable

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
| CLEAN-01 | Phase 1 | Complete |
| CLEAN-02 | Phase 1 | Complete |
| CLEAN-03 | Phase 1 | Complete |
| CLEAN-04 | Phase 1 | Complete |
| CLEAN-05 | Phase 1 | Complete |
| CLEAN-06 | Phase 1 | Complete |
| CLEAN-07 | Phase 1 | Complete |
| CLEAN-08 | Phase 1 | Complete |
| AUTH-01 | Phase 3 | Complete |
| AUTH-02 | Phase 3 | Complete |
| AUTH-03 | Phase 3 | Complete |
| AUTH-04 | Phase 3 | Complete |
| AUTH-05 | Phase 3 | Complete |
| AUTH-06 | Phase 3 | Complete |
| TEAM-01 | Phase 3 | Complete |
| TEAM-02 | Phase 3 | Complete |
| TEAM-03 | Phase 3 | Complete |
| TEAM-04 | Phase 3 | Complete |
| TEAM-05 | Phase 3 | Complete |
| TEAM-06 | Phase 3 | Pending |
| DB-01 | Phase 2 | Complete |
| DB-02 | Phase 2 | Complete |
| DB-03 | Phase 2 | Complete |
| DB-04 | Phase 2 | Complete |
| DB-05 | Phase 2 | Complete |
| DB-06 | Phase 2 | Complete |
| FILE-01 | Phase 4 | Complete |
| FILE-02 | Phase 4 | Complete |
| FILE-03 | Phase 4 | Complete |
| FILE-04 | Phase 4 | Complete |
| TRANS-01 | Phase 5 | Pending |
| TRANS-02 | Phase 5 | Pending |
| TRANS-03 | Phase 5 | Pending |
| TRANS-04 | Phase 5 | Pending |
| TRANS-05 | Phase 5 | Pending |
| TRANS-06 | Phase 5 | Pending |
| TRANS-07 | Phase 5 | Pending |
| TRANS-08 | Phase 5 | Pending |
| SRCH-01 | Phase 5 | Pending |
| SRCH-02 | Phase 5 | Pending |
| SRCH-03 | Phase 5 | Pending |
| IMEX-01 | Phase 6 | Pending |
| IMEX-02 | Phase 6 | Pending |
| IMEX-03 | Phase 6 | Pending |
| IMEX-04 | Phase 6 | Pending |
| IMEX-05 | Phase 6 | Pending |
| IMEX-06 | Phase 6 | Pending |
| AI-01 | Phase 7 | Pending |
| AI-02 | Phase 7 | Pending |
| AI-03 | Phase 7 | Pending |
| AI-04 | Phase 7 | Pending |
| AI-05 | Phase 7 | Pending |
| DEV-01 | Phase 8 | Pending |
| DEV-02 | Phase 8 | Pending |
| DEV-03 | Phase 8 | Pending |
| DEV-04 | Phase 8 | Pending |
| DEV-05 | Phase 8 | Pending |
| DEV-06 | Phase 8 | Pending |
| DEV-07 | Phase 8 | Pending |
| DEPL-01 | Phase 9 | Pending |
| DEPL-02 | Phase 9 | Pending |
| DEPL-03 | Phase 9 | Pending |
| DEPL-04 | Phase 9 | Pending |
| DEPL-05 | Phase 9 | Pending |
| DEPL-06 | Phase 9 | Pending |

**Coverage:**
- v1 requirements: 65 total
- Mapped to phases: 65
- Unmapped: 0

---
*Requirements defined: 2026-03-01*
*Last updated: 2026-03-01 after roadmap creation (traceability updated)*
