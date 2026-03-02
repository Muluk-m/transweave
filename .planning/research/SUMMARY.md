# Research Summary: v1.1 Branding & Promotion

**Project:** Transweave (rename from qlj-i18n)
**Researched:** 2026-03-01
**Confidence:** HIGH

## Executive Summary

The v1.1 branding milestone is primarily a **content and restructuring task**, not a technology task. Zero new runtime dependencies are needed — Next.js 15 has built-in support for OG image generation (`next/og`), favicon file conventions, and route groups for landing page isolation. The `motion` library (already installed) handles animations.

The project rename affects 53 distinct references across 20+ files in 7 naming patterns (`@qlj/`, `qlj-i18n`, `QLJ_I18N`, `qlji_`, `qlj-logo`, etc.). **Critical finding:** the `qlji_` API key prefix and `qlj-i18n-ai-salt` encryption salt are load-bearing infrastructure and must NOT be renamed — they are authentication/encryption contracts, not branding.

Logo is the critical-path dependency — favicon, social preview, OG images, landing page hero, and README header all derive from it. The README is the #1 branding asset (what developers see first on GitHub). Landing page belongs inside the existing Next.js app as a `(marketing)` route group.

## Key Findings

### Stack Additions
- **Zero new runtime deps.** Only add `sharp` (recommended by Next.js for production image optimization)
- **`next/og` (built-in):** OG image generation via `ImageResponse` — JSX-to-PNG, 500KB vs 50MB Puppeteer
- **Route groups:** `(marketing)/` and `(app)/` to isolate landing page from authenticated app
- **`motion` (already installed):** v12.18.1, sufficient for all landing page animations
- **Favicon:** 3 files only — `favicon.ico`, `favicon.svg` (dark mode CSS), `apple-touch-icon.png`

### Feature Table Stakes
| Feature | Complexity |
|---------|-----------|
| Project logo (SVG, icon + wordmark) | MEDIUM |
| Favicon set (ICO + SVG + Apple Touch) | LOW |
| GitHub social preview image | LOW |
| Professional README with branding | MEDIUM |
| README badge row (license, Docker, stars) | LOW |
| OG meta tags | LOW |
| Landing page with hero section | HIGH |
| Getting started section | LOW |
| Feature highlights | MEDIUM |
| Dark/light mode support | LOW |
| LICENSE file | LOW |

### Architecture — Rename Inventory
53 references across 7 naming patterns:
1. **Package names:** `@qlj/i18n-manager`, `qlj-i18n-server`, `nextjs`, `qlj-i18n` (CLI)
2. **Dockerfile filters:** `--filter nextjs`, `--filter qlj-i18n-server`
3. **CLI config:** `~/.config/qlj-i18n`, `.qlj-i18n.json`, `QLJ_I18N_API_KEY`, `QLJ_I18N_SERVER`
4. **UI strings:** `i18n/all.json` header titles, `app/layout.tsx` title
5. **MCP server name:** `qlj-i18n-mcp-server`
6. **SVG IDs:** `qlj-logo-gradient` in favicon.svg and logo.svg
7. **Docker:** service names, volume names, `.env.example` header

**DO NOT RENAME (load-bearing infrastructure):**
- `qlji_` API key prefix (auth routing signal in guard.ts)
- `qlj-i18n-ai-salt` encryption salt (AES-256-GCM for stored AI keys)
- `i18n_language` cookie name (functional, not branded)

### Build Order (dependency-critical)
1. **Logo & Visual Identity** — everything else depends on this
2. **Project Rename** — package names, Dockerfiles, CLI, configs (changes referenced everywhere)
3. **Landing Page** — route group restructure, hero, features, getting started
4. **README Rewrite** — logo, badges, screenshots, branded copy
5. **OG Images & Social** — derives from logo + branding, link sharing optimization

### Watch Out For
1. **API key prefix is NOT branding** — `qlji_` must stay, it's a protocol identifier
2. **Encryption salt change breaks stored AI keys** — `qlj-i18n-ai-salt` must stay
3. **Docker volume orphaning** — add explicit `name:` fields before rename
4. **Dockerfile `--filter` depends on package.json names** — update in sync
5. **Landing page over-engineering** — content before animations, timebox
6. **Incomplete rename** — use multi-pattern grep verification checklist
7. **Logo must work at 16px (favicon) through 512px (hero)** — test all sizes

## Implications for Roadmap

**Recommended 4 phases:**
1. Visual Identity (Logo, colors, favicon) — critical path, everything depends on it
2. Project Rename (package names, code refs, configs, Docker) — infrastructure changes
3. Landing Page & OG (route group, hero, features, social images) — web presence
4. README & Launch Prep (branded README, badges, screenshots, contributing docs) — GitHub presence

**Phase numbering continues from v1.0:** Phases 10-13.

## Research Flags

All phases use standard patterns. No `/gsd:research-phase` needed during planning.

## Sources

- Next.js 15 official docs (OG images, file conventions, route groups)
- Evil Martians favicon guide (3-file approach)
- Evil Martians dev tool landing page study (100+ pages analyzed)
- Tolgee, Biome, Drizzle ORM, shadcn landing page analysis
- Direct codebase audit (53 naming references catalogued via grep)
- shields.io badge documentation

---
*Research completed: 2026-03-01*
*Ready for roadmap: yes*
