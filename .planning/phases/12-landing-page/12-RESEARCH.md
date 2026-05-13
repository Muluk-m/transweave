# Phase 12: Landing Page - Research

**Researched:** 2026-05-13
**Domain:** Next.js 15 marketing landing page — route restructuring, dynamic OG image, dark/light theming, SEO
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LAND-01 | Landing page at root URL with hero, headline, tagline, dual CTAs | `WelcomeView` already implements all hero elements |
| LAND-02 | Feature highlights section showcasing 4-6 core capabilities | `WelcomeView` already renders 6 feature cards via i18n keys `features.items.*` |
| LAND-03 | Getting started section with docker-compose code block + copy button | `WelcomeView` quickstart section already covers this |
| LAND-04 | OG meta tags + dynamic OG image via `next/og` | Static `/og-image.png` present; dynamic generation pending |
| LAND-05 | Dark/light mode supported on landing | `layout.tsx` currently forces `<html className="dark">`; theme toggle missing |
</phase_requirements>

---

## Key Finding

Most landing content **already exists** in `packages/web/components/views/welcomeView.tsx` (367 lines) — hero, 6 feature cards, 3-step quickstart, integrations showcase, final CTA. All copy is i18n-driven (`welcome.*`, `features.*`, `quickstart.*`, `integrations.*`, `cta.*` keys in `zh-CN.json` / `en-US.json`). The component currently renders **only when the user is unauthenticated** (gated by `app/page.tsx`).

Phase 12 is therefore not "build a landing page" but **"unconditionally expose the existing landing, give it its own non-app layout, add dynamic OG + light mode."**

## Current Architecture

```
app/
  layout.tsx       — forces .dark, wraps children with Auth/Header/Sidebar/I18n providers
  page.tsx         — auth gate: <WelcomeView /> if unauth, <TeamsView /> if auth
  login/, project/, team/, settings/, ...  — authed pages
```

**Problem:** Even when a logged-out visitor sees the landing, the page still loads the full auth-aware layout chrome. For a marketing surface that should serve uncached HTML to anonymous visitors, this is heavier than necessary and couples landing to the app shell.

## Route Restructuring Decision (D-12-01)

The v1.1 strategic note in `STATE.md` already locked this: **landing page as `(marketing)` route group inside existing Next.js app**. Two viable shapes:

| Option | Authed app URL | Landing URL | Cost |
|---|---|---|---|
| A. Move authed app to `/app/*` | `/app`, `/app/project/...` | `/` | Breaks all internal links + auth redirects across server |
| B. Keep `/` as auth gate; add `(marketing)` group for content-only sub-routes | `/` (gated) | `/`, `/features`, `/pricing` (future) | Low — landing logic stays in `page.tsx`, new layout only loads for `(marketing)` group routes |

**Recommendation: Option B with a twist** — keep `/` as the gate but extract WelcomeView into the `(marketing)` group so it can render without the app shell when reached from social links / sitemap / SEO crawlers. The auth-gate `page.tsx` becomes a thin redirect or renders the marketing layout inline.

Actually the cleanest minimal shape:
- Make `(marketing)/page.tsx` the new root, with its own minimal layout (no auth/header/sidebar).
- Auth-gated app lives at `app/(app)/page.tsx` etc., or move TeamsView to `/teams` and redirect `/` → `/teams` when authenticated.

The route group decision deserves its own plan with a brief design-review pass.

## OG Image Decision (D-12-02)

Existing static `/og-image.png` (1200x630, Phase 10 output) is fine for now. `next/og` dynamic generation is only worth adding if landing copy diversifies (multi-page marketing site). For v1.1, **static is sufficient**; tag this as deferred unless the user wants dynamic per-page OG cards.

## Theming Decision (D-12-03)

`app/layout.tsx:38` hard-codes `<html suppressHydrationWarning className="dark">`. To support light mode we need:

1. Replace the static `className="dark"` with a client-side theme provider (e.g., `next-themes`)
2. Add a theme toggle in the landing nav
3. Verify all `WelcomeView` Tailwind classes use semantic tokens (`bg-background`, `text-foreground`, `border-border`) — spot check shows yes, they do

**Risk:** Adding `next-themes` is a runtime dep addition; team note in STATE.md says "Zero new runtime deps needed (next/og built-in, motion already installed)". Need to either confirm a built-in alternative works (CSS `prefers-color-scheme` only, no toggle) or amend the dep policy. Built-in CSS-only theming (no toggle) is the lowest-friction path and matches DESIGN.md's stance that dark is the default brand identity.

## Plan Index

| Plan | Title | Wave |
|---|---|---|
| 12-01 | Route restructuring: extract landing into `(marketing)` group with minimal layout | 1 |
| 12-02 | SEO: metadata polish, sitemap.xml, robots.txt, structured data (JSON-LD) | 2 |
| 12-03 | Theming: CSS-only `prefers-color-scheme` light mode support on landing | 2 |
| 12-04 | (Optional) Dynamic OG image via `next/og` for per-section social cards | 3 |
| 12-05 | Browser verification: /browse audit against DESIGN.md, before/after screenshots | 4 |

Plans 12-02 and 12-03 are independent and can run in parallel (Wave 2).

## Open Decisions for User

1. **Light mode**: built-in `prefers-color-scheme` (no toggle) **vs** `next-themes` with manual toggle
2. **Dynamic OG**: ship static-only **vs** add `next/og` for per-page cards (LAND-04 says "OG image generated via next/og" — strict reading requires dynamic)
3. **Auth gate vs `/app/*` split**: keep `/` gated **vs** clean separation

Default recommendation: CSS-only light mode, static OG (LAND-04 reinterpreted as "OG meta tags present + working preview image"), keep `/` as auth gate.

---
*Phase: 12-landing-page*
*Researched: 2026-05-13*
