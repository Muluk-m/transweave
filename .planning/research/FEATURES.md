# Feature Research

**Domain:** Self-hosted open-source i18n / translation management platform
**Researched:** 2026-03-01
**Confidence:** MEDIUM-HIGH (based on analysis of Tolgee, Weblate, Crowdin, Lokalise, Traduora, Localazy, SimpleLocalize)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete. These are non-negotiable for a self-hosted i18n tool to be taken seriously.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Translation key CRUD** | Core function of any TMS; every platform has it | LOW | **Already exists.** Token creation, reading, updating, deleting with multi-language values. |
| **Multi-language support** | Pointless without it; users need to manage 2-50+ languages per project | LOW | **Already exists.** Languages per project with add/remove. |
| **File import/export (JSON, YAML, CSV, XLIFF)** | Developers need to get translations in/out of their codebase; every competitor supports 4+ formats | MEDIUM | **Partially exists.** Current: JSON, CSV, XML, YAML export as ZIP. Missing: XLIFF (industry standard), Gettext (.po), Android XML, iOS Strings. Add XLIFF and Gettext minimum. |
| **Project organization** | Teams manage multiple products/apps; need project isolation | LOW | **Already exists.** Projects with team association. |
| **Team management & RBAC** | Multi-user access with roles (admin/manager/translator/viewer); every competitor has this | LOW | **Already exists.** Owner/manager/member roles with membership service. |
| **Search & filter translations** | With 1000+ keys, finding things fast is essential; all platforms have instant search | LOW | **Partially exists.** Need: full-text search across keys and values, filter by language completion status, filter by module/namespace. |
| **Translation progress/completeness tracking** | Users need to see "French is 85% done"; every competitor shows this prominently | LOW | **Not built yet.** Per-language completion percentage per project. Visible on dashboard. |
| **Docker/docker-compose deployment** | Self-hosted tools that don't offer one-command deployment lose users immediately; Tolgee, Weblate, Traduora all have this | MEDIUM | **Planned.** Listed in PROJECT.md active requirements. |
| **REST API** | Developers integrate TMS into CI/CD; Crowdin, Tolgee, Weblate, Traduora all expose REST APIs | LOW | **Partially exists.** Controllers expose endpoints but no documented public API contract. Need: versioned API, API documentation, API keys for programmatic access. |
| **Activity/audit log** | Teams need to know who changed what and when; Tolgee, Weblate, Crowdin all track this | LOW | **Already exists.** ActivityLog service with project timelines and user stats. |
| **Username/password auth** | Baseline for self-hosted; users need to create accounts without external OAuth | LOW | **Planned.** Current system relies on Feishu OAuth. Must add standalone auth. |
| **Responsive web UI** | Users expect it to work on tablets at minimum; Weblate explicitly supports mobile | LOW | **Already exists.** Radix + Tailwind responsive layout. |
| **Bulk operations** | Moving/tagging/deleting multiple keys at once; tedious without it | MEDIUM | **Partially exists.** Batch module assignment exists. Need: bulk delete, bulk status change, bulk tag assignment. |
| **Translation comments/notes** | Translators need context from developers; every TMS has per-key comments | LOW | **Not built yet.** Add comment thread per translation key. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but create real competitive advantage. Focus on areas where qlj-i18n already has a head start or can leapfrog competitors.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **AI-assisted translation (multi-provider)** | Most self-hosted platforms have basic MT (Google/DeepL). Qlj already integrates Dify for AI translation. Make this configurable: OpenAI, DeepL, Google, self-hosted LLMs. Few OSS competitors offer flexible AI backends. | MEDIUM | **Partially exists.** Current Dify integration works. Make provider-agnostic with config. Tolgee supports DeepL/Google/AWS; we can differentiate by supporting self-hosted LLMs (Ollama, vLLM). |
| **AI-assisted key generation** | No competitor offers AI-generated translation key names from context. Reduces bikeshedding on key naming conventions. | LOW | **Already exists.** Unique feature not found in Tolgee, Weblate, or Traduora. Market this prominently. |
| **MCP server for AI coding assistants** | Tolgee has MCP support, but most platforms don't. This lets Claude/Copilot/Cursor manage translations from the IDE. Growing demand as AI coding assistants become standard. | LOW | **Already exists.** MCP controller and service built. This is a genuine differentiator over Weblate, Traduora, Crowdin. |
| **Module/namespace organization** | Group keys by feature/page/domain. Tolgee has namespaces, Weblate has components, but many smaller platforms lack this. Enables lazy-loading translations in apps. | LOW | **Already exists.** Module support with CRUD. Strengthen by adding nested namespaces and filtering. |
| **CLI tool for CI/CD integration** | Push/pull translations from terminal. Crowdin, Tolgee, Lokalise all have CLIs. A dedicated CLI makes developer adoption frictionless. | MEDIUM | **Not built yet.** Build a simple `qlj-i18n pull/push` CLI. Traduora only has an unofficial community CLI -- this is an opportunity. |
| **Import preview/diff** | See exactly what will change before importing. Reduces accidental overwrites. Not common in OSS platforms. | LOW | **Already exists.** `previewImport` endpoint shows changes before committing. Uncommon feature -- differentiator. |
| **Dual database support (SQLite + PostgreSQL)** | SQLite for 5-minute getting started, PostgreSQL for production. Tolgee requires PostgreSQL. Weblate requires PostgreSQL. Lower barrier to entry. | HIGH | **Planned.** Listed in PROJECT.md. Genuine advantage for quick evaluation. |
| **In-context editing SDK** | Tolgee's flagship feature: ALT+click to translate in-app. Extremely compelling for non-technical translators. | HIGH | **Not built.** This is Tolgee's biggest draw. Consider as v2+ feature. Requires JS SDK embedded in user's app. |
| **Translation memory** | Reuse past translations to speed up work and ensure consistency. Tolgee, Weblate, Crowdin all have this. | MEDIUM | **Not built yet.** Store translation pairs, compute fuzzy match similarity. Moves from differentiator to table stakes at scale. |
| **Webhook support** | Notify external systems when translations change. Enables custom workflows without polling. Crowdin and Lokalise have comprehensive webhook systems. | LOW | **Not built yet.** Add configurable webhooks for key events (translation updated, import completed, etc.). |
| **Branching / versioning** | Work on translations for different release branches. Lokalise and Crowdin support this. Valuable for teams with parallel releases. | HIGH | **Not built.** Complex to implement well. Strong differentiator for enterprise users. Defer to v2+. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems for a self-hosted OSS platform. Deliberately NOT building these.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Real-time collaborative editing (Google Docs-style)** | "Multiple translators working on same key simultaneously" | Massive implementation complexity (CRDT/OT), edge cases with conflicts, requires WebSocket infrastructure. Weblate doesn't do it. Tolgee doesn't do it. Even Crowdin's "real-time" is per-string locking, not true co-editing. PROJECT.md explicitly marks this out of scope. | Optimistic locking with conflict detection. Last-save-wins with activity log showing who changed what. |
| **Multi-tenant SaaS mode** | "I want to offer this to my clients as a service" | Completely different product. Tenant isolation, billing, usage metering, onboarding flows. Splits focus between self-hosted and SaaS. PROJECT.md explicitly out of scope. | Ship as self-hosted. If users want multi-org, they run separate instances. |
| **Built-in email verification / password reset** | "Standard auth feature" | Requires SMTP configuration, email templates, delivery reliability. Adds deployment complexity for self-hosted users who just want to run a tool. | Username/password without email. Admin can reset passwords. Add email auth as optional plugin later. |
| **Mobile native app** | "Translators want to work from their phones" | Separate codebase to maintain (iOS + Android). The responsive web UI already works on mobile browsers. PROJECT.md out of scope. | Responsive web UI with PWA capabilities if needed. |
| **Over-the-air (OTA) translation delivery** | "Push translations to mobile apps without app store update" | Requires CDN infrastructure, SDK for every mobile platform, caching strategy, rollback mechanism. Lokalise's OTA is a major SaaS product in itself. | Export translations via API. Users can build their own CDN/caching layer. Provide documentation for common patterns. |
| **60+ file format support** | "Support every format Crowdin supports" | Diminishing returns. 80% of users need JSON + XLIFF + Gettext + YAML. Each format adds maintenance burden and edge cases. Weblate's 50+ formats required years of development. | Support top 8-10 formats (JSON flat/nested, XLIFF, Gettext .po, YAML, Android XML, iOS Strings, CSV, Properties). Add format plugins API for community contribution. |
| **Built-in glossary management** | "Enforce terminology consistency" | Separate data model, UI, and enforcement logic. Useful but not core for v1. Crowdin and Weblate both treat glossaries as advanced features added later. | Allow per-project notes/guidelines. Add glossary as v1.x feature after core stabilizes. |
| **Crowdsourcing / public translation portal** | "Let the community translate our OSS project" | Different UX for anonymous/public contributors vs team members. Moderation, spam prevention, quality control. Weblate excels here but it's their primary use case. | Focus on team-based workflows. If needed, add "viewer with suggest" role later. |

## Feature Dependencies

```
[Username/Password Auth]
    └──requires──> [User Model + JWT] (already exists)

[Translation Progress Tracking]
    └──requires──> [Translation Key CRUD] (already exists)
    └──requires──> [Multi-language Support] (already exists)

[CLI Tool]
    └──requires──> [REST API with API Keys]
                       └──requires──> [Auth System]

[AI Translation (multi-provider)]
    └──requires──> [Translation Key CRUD] (already exists)
    └──enhances──> [Import Preview] (already exists)

[Translation Memory]
    └──requires──> [Translation Key CRUD] (already exists)
    └──enhances──> [AI Translation]

[Webhook Support]
    └──requires──> [REST API] (already exists)
    └──enhances──> [CLI Tool]

[Docker Deployment]
    └──requires──> [Database Abstraction (SQLite/PostgreSQL)]
                       └──requires──> [Remove MongoDB dependency]

[Import/Export Expanded Formats]
    └──requires──> [Import/Export Base] (already exists)

[Translation Comments]
    └──requires──> [Translation Key CRUD] (already exists)
    └──enhances──> [Activity Log] (already exists)

[Branching/Versioning]
    └──requires──> [Project Organization] (already exists)
    └──requires──> [Import/Export] (already exists)
    └──conflicts──> [Simple data model] (adds significant schema complexity)

[In-Context Editing SDK]
    └──requires──> [REST API with API Keys]
    └──requires──> [SDK development per framework]
    └──conflicts──> [Fast v1 delivery] (large scope)
```

### Dependency Notes

- **CLI Tool requires REST API with API Keys:** CLI authenticates via API keys, not username/password. Need API key management before CLI is useful.
- **Docker Deployment requires Database Abstraction:** Cannot ship Docker images until the MongoDB-to-SQLite/PostgreSQL migration is complete. This is the critical path.
- **Translation Memory enhances AI Translation:** TM suggestions can supplement or replace AI suggestions, reducing API costs. Build TM after AI translation is configurable.
- **Branching conflicts with Simple data model:** Branching requires versioned copies of all translation data. Adds significant complexity to every query. Defer until core is proven.
- **In-Context Editing SDK conflicts with Fast v1 delivery:** Requires per-framework packages (React, Vue, Angular, Svelte). Each is a separate project. Tolgee took years to build these. Not viable for v1.

## MVP Definition

### Launch With (v1)

Minimum viable product -- what's needed for early adopters to evaluate and use.

- [x] Translation key CRUD with multi-language values -- core function (already exists)
- [x] Project and team management with RBAC -- organizational structure (already exists)
- [x] Activity logging -- trust and accountability (already exists)
- [x] Module/namespace organization -- key organization (already exists)
- [x] Import preview -- safety for imports (already exists)
- [ ] Username/password authentication -- replace Feishu OAuth for self-hosted users
- [ ] Docker/docker-compose deployment -- one-command startup
- [ ] Database abstraction (SQLite + PostgreSQL) -- remove MongoDB dependency
- [ ] Translation progress tracking -- per-language completion visibility
- [ ] Expanded file format support (add XLIFF, Gettext) -- interoperability with translator tools
- [ ] Full-text search with filters -- usable at 1000+ keys
- [ ] Translation comments -- developer-translator communication
- [ ] API keys for programmatic access -- enable automation
- [ ] Configurable AI translation backend (optional) -- differentiator from day one
- [ ] Remove all internal business dependencies -- clean OSS release

### Add After Validation (v1.x)

Features to add once core is working and users are providing feedback.

- [ ] CLI tool (`qlj-i18n push/pull`) -- when users request CI/CD integration
- [ ] Translation memory -- when users have enough translations to benefit from reuse
- [ ] Webhook support -- when users need integration with external workflows
- [ ] Glossary management -- when users request terminology consistency enforcement
- [ ] Bulk operations expansion -- when users manage large projects (5000+ keys)
- [ ] Additional file formats (Android XML, iOS Strings, Flutter ARB) -- driven by user platform requests

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] In-context editing SDK -- high complexity, requires per-framework packages; evaluate after v1 adoption
- [ ] Branching/versioning -- enterprise-grade feature; evaluate demand after v1
- [ ] Over-the-air translation delivery -- essentially a separate product; only if strong demand
- [ ] Public/crowdsource translation portal -- different user persona; only if OSS community projects adopt the platform
- [ ] Plugin/extension system -- only after core API is stable and patterns are clear

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority | Status |
|---------|------------|---------------------|----------|--------|
| Username/password auth | HIGH | LOW | P1 | Planned |
| Docker/compose deployment | HIGH | MEDIUM | P1 | Planned |
| Database abstraction (SQLite + PG) | HIGH | HIGH | P1 | Planned |
| Remove business dependencies | HIGH | MEDIUM | P1 | Planned |
| Translation progress tracking | HIGH | LOW | P1 | Not started |
| Search & filter improvements | HIGH | LOW | P1 | Partial |
| Translation comments | MEDIUM | LOW | P1 | Not started |
| API keys for programmatic access | MEDIUM | LOW | P1 | Not started |
| Expanded formats (XLIFF, Gettext) | MEDIUM | MEDIUM | P1 | Not started |
| Configurable AI translation | HIGH | MEDIUM | P1 | Partial |
| CLI tool | HIGH | MEDIUM | P2 | Not started |
| Translation memory | MEDIUM | MEDIUM | P2 | Not started |
| Webhook support | MEDIUM | LOW | P2 | Not started |
| Glossary management | MEDIUM | MEDIUM | P2 | Not started |
| Bulk operations expansion | MEDIUM | LOW | P2 | Partial |
| Additional formats (Android, iOS) | MEDIUM | MEDIUM | P2 | Not started |
| In-context editing SDK | HIGH | HIGH | P3 | Not started |
| Branching/versioning | MEDIUM | HIGH | P3 | Not started |
| OTA delivery | MEDIUM | HIGH | P3 | Not started |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible (v1.x)
- P3: Nice to have, future consideration (v2+)

## Competitor Feature Analysis

| Feature | Tolgee | Weblate | Traduora | Crowdin | Our Approach |
|---------|--------|---------|----------|---------|--------------|
| **Self-hosted** | Yes (Docker) | Yes (Docker, pip) | Yes (Docker) | No (SaaS only) | Yes (Docker) |
| **License** | Apache 2.0 | GPL 3.0 | AGPL 3.0 | Proprietary | TBD (prefer permissive: MIT or Apache 2.0) |
| **Auth** | Built-in + OAuth | Built-in + LDAP + SSO | Built-in + OAuth | SSO/OAuth | Built-in username/password (simple, no external deps) |
| **File formats** | 20+ (JSON, XLIFF, PO, Android, iOS, Flutter) | 50+ formats | 8 formats (JSON, YAML, CSV, XLIFF, PO, Strings, Android, Properties) | 60+ formats | Start with 8-10 core formats; plugin system for more |
| **Translation memory** | Yes | Yes | No | Yes | v1.x (after core stabilizes) |
| **Machine translation** | DeepL, Google, AWS | Multiple MT services | No built-in | Multiple MT + AI | Configurable multi-provider including self-hosted LLMs |
| **AI features** | Basic MT, MCP server | Basic MT | None | OpenAI, Gemini, Azure | AI translation, AI key generation, MCP server (strongest AI story) |
| **CLI** | Yes (official) | No (uses Git integration) | Unofficial community CLI | Yes (official) | v1.x (official CLI) |
| **In-context editing** | Yes (flagship feature) | No | No | Yes (limited) | v2+ consideration |
| **VCS integration** | GitHub, GitLab | Deep Git/Mercurial integration | Git, SVN | GitHub, GitLab, Bitbucket | v2+ (API-first approach for v1) |
| **Branching** | No | Branch support via Git | No | Yes | v2+ consideration |
| **Translation comments** | Yes | Yes | No | Yes | v1 (low complexity) |
| **Quality checks** | Basic | Extensive (customizable) | No | Extensive | v1.x (basic), v2+ (customizable) |
| **Progress tracking** | Yes | Yes | Basic | Yes | v1 (essential) |
| **Glossary** | Yes | Yes | No | Yes | v1.x |
| **Webhooks** | Yes | Yes | No | Yes | v1.x |
| **Database** | PostgreSQL only | PostgreSQL only | MySQL/PostgreSQL | N/A (SaaS) | SQLite (dev) + PostgreSQL (prod) -- lower barrier |
| **MCP/AI assistant** | Yes | No | No | No | Yes (already built) |
| **Import preview** | No | No | No | No | Yes (already built -- unique) |
| **Module/namespace org** | Namespaces | Components | Projects only | Folders + branches | Modules (already built) |
| **Activity/audit log** | Yes | Yes (via Git) | No | Yes | Yes (already built) |

### Competitive Positioning Summary

**vs Tolgee:** Our AI story is stronger (multi-provider + AI key generation + MCP). Tolgee wins on in-context editing and broader format support. We win on database flexibility (SQLite quick-start) and import preview.

**vs Weblate:** Weblate is mature, battle-tested, and deeply integrated with Git. We differentiate on modern tech stack (Next.js + NestJS vs Django), AI features, and simpler deployment. Weblate's strength is its ecosystem breadth; our strength is developer-focused AI workflows.

**vs Traduora:** Traduora is feature-light and largely unmaintained (last major commit activity has slowed). We surpass it on nearly every dimension. Traduora's simplicity is its only advantage; we match it with SQLite quick-start.

**vs Crowdin/Lokalise:** These are enterprise SaaS products. We don't compete directly. We serve teams who want self-hosted control, AI flexibility, and zero vendor lock-in.

## Sources

- [Tolgee GitHub - tolgee-platform](https://github.com/tolgee/tolgee-platform) - Feature list, architecture, supported formats
- [Tolgee Documentation - Supported Formats](https://docs.tolgee.io/platform/supported_formats) - File format details
- [Weblate Features Page](https://weblate.org/en/features/) - Comprehensive feature listing
- [Weblate GitHub](https://github.com/WeblateOrg/weblate) - Architecture and capabilities
- [Traduora GitHub (ever-co/ever-traduora)](https://github.com/ever-co/ever-traduora) - Features and format support
- [Crowdin Features](https://support.crowdin.com/features/) - Enterprise feature set
- [Crowdin Documentation](https://support.crowdin.com/translation-process-overview/) - Workflow automation, TM, glossary
- [Lokalise Developer Tools](https://lokalise.com/product/for-developers/) - API, webhooks, branching, OTA
- [Tolgee vs Weblate Comparison (OpenAlternative)](https://openalternative.co/compare/tolgee/vs/weblate)
- [Crowdin vs Lokalise Comparison (Capterra)](https://www.capterra.com/compare/162858-163509/Lokalise-vs-Crowdin)
- [Localazy CLI](https://localazy.com/features/cli) - CLI feature patterns
- [SimpleLocalize Namespaces](https://simplelocalize.io/blog/posts/namespace/) - Namespace organization patterns
- [POEditor Namespaces](https://poeditor.com/blog/namespaces-in-localization/) - Namespace best practices

---
*Feature research for: Self-hosted open-source i18n management platform*
*Researched: 2026-03-01*
