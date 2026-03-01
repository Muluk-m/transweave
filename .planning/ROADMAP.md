# Roadmap: qlj-i18n Open Source Edition

## Overview

This roadmap converts an internal i18n management platform into an open-source, self-hosted tool. The journey moves through cleanup (removing proprietary code and secrets), rebuilding the data layer (MongoDB to PGlite/PostgreSQL via Drizzle), restoring all user-facing capabilities on the new foundation (auth, teams, files, translations, import/export, AI), adding developer tooling (CLI, MCP, API keys), and packaging everything for one-command deployment. Each phase delivers a verifiable capability that builds on the previous.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Cleanup & Branch Setup** - Remove all proprietary code, secrets, and internal references; create clean orphan branch
- [ ] **Phase 2: Database Foundation** - Migrate data layer from Mongoose/MongoDB to Drizzle ORM with PGlite and PostgreSQL support
- [ ] **Phase 3: Authentication & Teams** - Built-in username/password auth, team management, RBAC, and first-run setup
- [ ] **Phase 4: Local File Storage** - Replace external CDN with local disk storage and static file serving
- [ ] **Phase 5: Translation Core & Search** - Full translation token management with search, filtering, history, and bulk operations
- [ ] **Phase 6: Import & Export** - Multi-format file import/export with preview and diff
- [ ] **Phase 7: AI Translation** - Multi-provider AI translation with user-supplied API keys (optional feature)
- [ ] **Phase 8: Developer Tools** - CLI tool, MCP server, API key management, and REST API documentation
- [ ] **Phase 9: Deployment & Production Readiness** - Docker Compose packaging, environment config, health checks, and setup documentation

## Phase Details

### Phase 1: Cleanup & Branch Setup
**Goal**: A clean git branch exists with zero proprietary code, secrets, or internal references -- safe to make public
**Depends on**: Nothing (first phase)
**Requirements**: CLEAN-01, CLEAN-02, CLEAN-03, CLEAN-04, CLEAN-05, CLEAN-06, CLEAN-07, CLEAN-08
**Success Criteria** (what must be TRUE):
  1. An orphan git branch (opensource) exists with no inherited commit history containing secrets
  2. No Feishu OAuth code exists anywhere in the codebase (grep returns zero matches for feishu, lark, oapi)
  3. No internal company references exist (qiliangjia.org, qiliangjia.one, bondma, internal emails, hardcoded MongoDB ObjectIds)
  4. A secret scanner (gitleaks or equivalent) returns zero findings on the entire branch
  5. .gitignore excludes .env files and .dockerignore exists
**Plans**: 2 plans

Plans:
- [ ] 01-01-PLAN.md -- Remove all proprietary code (Feishu OAuth, company references, hardcoded secrets, branding)
- [ ] 01-02-PLAN.md -- Update .gitignore, create .dockerignore, create clean orphan branch, verify with secret scanner

### Phase 2: Database Foundation
**Goal**: All data models are defined in Drizzle ORM with a repository abstraction layer, and the application can connect to either PGlite or PostgreSQL based on configuration
**Depends on**: Phase 1
**Requirements**: DB-01, DB-02, DB-03, DB-04, DB-05, DB-06
**Success Criteria** (what must be TRUE):
  1. Drizzle schema files define all entities (User, Team, Membership, Project, Token, TokenHistory, ActivityLog) with PostgreSQL types including JSONB for flexible fields
  2. Running drizzle-kit generates migration files that apply cleanly to both PGlite and PostgreSQL
  3. Setting DATABASE_URL to a PostgreSQL connection string uses the PostgreSQL driver; omitting it or setting it to a file path uses PGlite
  4. Repository classes exist for every entity, and no service code imports Drizzle or database drivers directly
  5. A simple integration test can create, read, update, and delete a record through the repository layer on both database backends
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD
- [ ] 02-03: TBD

### Phase 3: Authentication & Teams
**Goal**: Users can register, log in, manage teams, and control access -- all without any external auth provider
**Depends on**: Phase 2
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, TEAM-01, TEAM-02, TEAM-03, TEAM-04, TEAM-05, TEAM-06
**Success Criteria** (what must be TRUE):
  1. A new user can register with username and password, then log in and receive a JWT that persists across browser refreshes
  2. On first launch with an empty database, a setup wizard creates the initial admin user and default team
  3. A team owner can invite members, assign roles (owner/manager/member), change roles, and remove members
  4. A user who belongs to multiple teams can view and switch between them
  5. An admin can reset any other user's password
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD
- [ ] 03-03: TBD

### Phase 4: Local File Storage
**Goal**: File uploads and screenshots work using local disk storage with no external CDN dependency
**Depends on**: Phase 2
**Requirements**: FILE-01, FILE-02, FILE-03, FILE-04
**Success Criteria** (what must be TRUE):
  1. Uploading a file via the API stores it on the local disk in a configurable directory
  2. Uploaded files are accessible via a built-in static file server URL (no external CDN needed)
  3. Attaching a screenshot to a translation token saves and displays correctly using local storage
**Plans**: TBD

Plans:
- [ ] 04-01: TBD

### Phase 5: Translation Core & Search
**Goal**: Users can fully manage translation tokens with multi-language values, organize them, track history, and find what they need through search and filtering
**Depends on**: Phase 3, Phase 4
**Requirements**: TRANS-01, TRANS-02, TRANS-03, TRANS-04, TRANS-05, TRANS-06, TRANS-07, TRANS-08, SRCH-01, SRCH-02, SRCH-03
**Success Criteria** (what must be TRUE):
  1. User can create, edit, and delete translation tokens with values in multiple languages, organized by modules/namespaces
  2. User can view the change history of any translation token
  3. Translation progress is visible as per-language completion percentage on the project view
  4. User can search across token keys and translation values, and filter by language completion status or module
  5. User can perform bulk operations (delete, status change, tag) on selected translations
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD
- [ ] 05-03: TBD

### Phase 6: Import & Export
**Goal**: Users can get translation data in and out of the platform in standard file formats with confidence about what will change
**Depends on**: Phase 5
**Requirements**: IMEX-01, IMEX-02, IMEX-03, IMEX-04, IMEX-05, IMEX-06
**Success Criteria** (what must be TRUE):
  1. User can import translations from JSON, YAML, XLIFF, and Gettext (.po) files
  2. User can export translations in JSON, YAML, CSV, XLIFF, and Gettext formats
  3. Before applying an import, the user sees a preview diff showing which tokens will be added, modified, or unchanged
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD

### Phase 7: AI Translation
**Goal**: Users who have their own AI/translation API keys can use AI-assisted translation, while the platform works fully without any AI configured
**Depends on**: Phase 5
**Requirements**: AI-01, AI-02, AI-03, AI-04, AI-05
**Success Criteria** (what must be TRUE):
  1. The platform starts and operates fully (all CRUD, search, import/export) with no AI provider configured
  2. User can configure an AI provider (OpenAI, Claude, DeepL, or Google Translate) by entering their own API key at the team or project level
  3. User can trigger AI translation for a single token or a batch of selected tokens, and the translated values appear in the UI
**Plans**: TBD

Plans:
- [ ] 07-01: TBD
- [ ] 07-02: TBD

### Phase 8: Developer Tools
**Goal**: Developers can interact with the platform programmatically -- pulling/pushing translations from the command line, using AI coding assistants via MCP, and integrating via documented REST APIs
**Depends on**: Phase 5
**Requirements**: DEV-01, DEV-02, DEV-03, DEV-04, DEV-05, DEV-06, DEV-07
**Success Criteria** (what must be TRUE):
  1. A developer can generate an API key from the web UI and use it to authenticate CLI and API requests
  2. Running `qlj-i18n pull` downloads translation files from the server to local disk; running `qlj-i18n push` uploads local files to the server
  3. An AI coding assistant connected via MCP can list projects, list tokens, create tokens, and update token values
  4. A REST API reference document exists listing all endpoints with request/response examples
**Plans**: TBD

Plans:
- [ ] 08-01: TBD
- [ ] 08-02: TBD
- [ ] 08-03: TBD

### Phase 9: Deployment & Production Readiness
**Goal**: A new user can go from git clone to running platform in under 5 minutes with Docker, or run locally without Docker using PGlite
**Depends on**: Phase 1-8 (all prior phases)
**Requirements**: DEPL-01, DEPL-02, DEPL-03, DEPL-04, DEPL-05, DEPL-06
**Success Criteria** (what must be TRUE):
  1. Running `docker-compose up` starts the complete platform (web, server, PostgreSQL) and the UI is accessible in the browser
  2. Running the server without Docker and without DATABASE_URL uses PGlite as a zero-config database (no PostgreSQL install needed)
  3. A .env.example file documents every required and optional environment variable
  4. Data (database and uploads) persists across container restarts via Docker volumes
  5. A README exists with clear step-by-step instructions for both Docker and local development setup
**Plans**: TBD

Plans:
- [ ] 09-01: TBD
- [ ] 09-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9
Note: Phases 6, 7, and 8 all depend on Phase 5 but are independent of each other. They can be executed in any order after Phase 5 completes.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Cleanup & Branch Setup | 0/2 | Not started | - |
| 2. Database Foundation | 0/3 | Not started | - |
| 3. Authentication & Teams | 0/3 | Not started | - |
| 4. Local File Storage | 0/1 | Not started | - |
| 5. Translation Core & Search | 0/3 | Not started | - |
| 6. Import & Export | 0/2 | Not started | - |
| 7. AI Translation | 0/2 | Not started | - |
| 8. Developer Tools | 0/3 | Not started | - |
| 9. Deployment & Production Readiness | 0/2 | Not started | - |
