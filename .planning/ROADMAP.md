# Roadmap: Transweave

## Milestones

- v1.0 Open Source Edition (Phases 1-9) -- shipped 2026-03-01
- v1.1 Branding & Promotion (Phases 10-13) -- in progress

## Overview

This milestone establishes Transweave as a recognizable open-source brand. The work flows from visual identity (logo, colors, favicons) through project rename (53 code references across 7 naming patterns) to a promotional landing page and polished README. Logo is the critical-path dependency -- favicon, social preview, OG images, landing page hero, and README header all derive from it. The rename touches package names, Dockerfiles, CLI, MCP server, and documentation while preserving load-bearing infrastructure (`qlji_` API key prefix, `qlj-i18n-ai-salt` encryption salt).

## Phases

**Phase Numbering:**
- Phases 10-13: v1.1 Branding & Promotion
- Decimal phases (10.1, 11.1): Urgent insertions if needed (marked with INSERTED)

- [ ] **Phase 10: Visual Identity** - Logo, brand colors, favicon set, and GitHub social preview image
- [ ] **Phase 11: Project Rename** - Rename all code references from qlj-i18n to Transweave across packages, Docker, CLI, MCP, and docs
- [ ] **Phase 12: Landing Page** - Marketing landing page with hero, features, getting started, OG images, and dark/light mode
- [ ] **Phase 13: README & Community** - Branded README, CONTRIBUTING.md, LICENSE, GitHub issue/PR templates

## Phase Details

### Phase 10: Visual Identity
**Goal**: Transweave has a professional visual identity that works from 16px favicon to 512px hero, with consistent brand colors across the application
**Depends on**: Nothing (first phase of v1.1; v1.0 phases 1-9 complete)
**Requirements**: VIS-01, VIS-02, VIS-03, VIS-04, VIS-05
**Success Criteria** (what must be TRUE):
  1. An SVG logo exists with both icon+wordmark and icon-only variants, rendering cleanly at 16px through 512px
  2. Favicon set is deployed (favicon.ico, favicon.svg with dark mode support, apple-touch-icon.png) and browsers display the correct icon
  3. Brand colors are defined as both Tailwind theme extension and CSS custom properties, usable throughout the app
  4. A 1280x640px social preview image with the logo and tagline is uploaded to the GitHub repository settings
**Plans**: 4 plans
Plans:
- [ ] 10-01-PLAN.md -- SVG logo files: icon-only, wordmark, favicon SVG with dark mode
- [ ] 10-02-PLAN.md -- Brand color tokens: Tailwind extension and CSS custom properties
- [ ] 10-03-PLAN.md -- Favicon set deployment, Logo.tsx update, layout.tsx metadata, legacy asset cleanup
- [ ] 10-04-PLAN.md -- Social preview images (1280x640 GitHub + 1200x630 OG) and GitHub upload checkpoint

### Phase 11: Project Rename
**Goal**: Every user-visible and developer-facing reference says "Transweave" instead of "qlj-i18n", while preserving load-bearing infrastructure identifiers
**Depends on**: Phase 10
**Requirements**: REN-01, REN-02, REN-03, REN-04, REN-05, REN-06, REN-07, REN-08, REN-09
**Success Criteria** (what must be TRUE):
  1. All package.json files use @transweave scoped names and Dockerfile --filter flags match the new names
  2. CLI binary is `transweave` (not qlj-i18n) with updated command names, config paths (~/.config/transweave), and env vars
  3. MCP server registers as transweave-mcp-server and web UI shows "Transweave" in all titles and strings
  4. Docker Compose service and volume names use explicit name fields reflecting the Transweave brand
  5. A grep verification confirms zero remaining qlj-i18n/qlj_/nextjs references except the intentionally preserved `qlji_` API key prefix and `qlj-i18n-ai-salt` encryption salt
**Plans**: TBD

### Phase 12: Landing Page
**Goal**: Visitors to the root URL see a professional marketing page that communicates what Transweave is, what it does, and how to get started in under 30 seconds
**Depends on**: Phase 10, Phase 11
**Requirements**: LAND-01, LAND-02, LAND-03, LAND-04, LAND-05
**Success Criteria** (what must be TRUE):
  1. Root URL serves a landing page with hero section containing headline, tagline, and dual CTAs (e.g., "Get Started" and "View on GitHub")
  2. Feature highlights section showcases 4-6 core capabilities with icons/illustrations
  3. Getting started section displays a docker-compose code block with a working copy button
  4. Sharing the URL on social platforms (Twitter, Slack, Discord) shows a branded OG image with title and description
  5. Landing page renders correctly in both dark and light mode
**Plans**: TBD

### Phase 13: README & Community
**Goal**: A developer discovering Transweave on GitHub immediately understands what it is, how to run it, and how to contribute
**Depends on**: Phase 10, Phase 11, Phase 12
**Requirements**: DOC-01, DOC-02, DOC-03, DOC-04
**Success Criteria** (what must be TRUE):
  1. README displays the Transweave logo, a badge row (license, Docker pulls, GitHub stars), feature list, quick-start instructions, and at least one screenshot
  2. CONTRIBUTING.md documents development setup, coding standards, and PR process
  3. MIT LICENSE file exists at the repository root
  4. GitHub issue templates (bug report, feature request) and a PR template are configured in .github/
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 10 -> 11 -> 12 -> 13

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 10. Visual Identity | v1.1 | 0/4 | Not started | - |
| 11. Project Rename | v1.1 | 0/TBD | Not started | - |
| 12. Landing Page | v1.1 | 0/TBD | Not started | - |
| 13. README & Community | v1.1 | 0/TBD | Not started | - |

---

<details>
<summary>v1.0 Open Source Edition (Phases 1-9) -- SHIPPED 2026-03-01</summary>

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Cleanup & Branch Setup | 2/2 | Complete | 2026-03-01 |
| 2. Database Foundation | 3/3 | Complete | 2026-03-01 |
| 3. Authentication & Teams | 3/3 | Complete | 2026-03-01 |
| 4. Local File Storage | 1/1 | Complete | 2026-03-01 |
| 5. Translation Core & Search | 3/3 | Complete | 2026-03-01 |
| 6. Import & Export | 2/2 | Complete | 2026-03-01 |
| 7. AI Translation | 2/2 | Complete | 2026-03-01 |
| 8. Developer Tools | 3/3 | Complete | 2026-03-01 |
| 9. Deployment & Production Readiness | 2/2 | Complete | 2026-03-01 |

</details>
