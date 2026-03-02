# Feature Research

**Domain:** Open-source developer tool branding and promotion (i18n management platform)
**Researched:** 2026-03-01
**Confidence:** HIGH (based on analysis of Biome, Drizzle ORM, shadcn/ui, Turso, Tolgee, Astro, and Evil Martians' study of 100+ dev tool landing pages)

## Feature Landscape

This research focuses exclusively on branding and promotion features for the Transweave i18n management platform. The core product features (auth, teams, translation CRUD, AI translation, import/export, CLI, MCP server, Docker deployment) are already built. This milestone is about making Transweave discoverable, professional, and compelling to developers encountering it for the first time.

### Table Stakes (Users Expect These)

Features developers assume a credible open-source project has. Missing these = project looks abandoned or amateur. Developers form impressions in under 10 seconds.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Project logo (SVG, multiple sizes)** | Every serious OSS project has a logo. Biome has a flame, Drizzle has a lightning bolt, Tolgee has a parrot. A project without a logo signals "weekend side project." Logo appears in README, docs, landing page, favicon, OG images. | MEDIUM | Need: primary logo (icon + wordmark), icon-only variant, monochrome variant. SVG source for scalability. Must work at 16px (favicon) through 512px (landing page hero). "Transweave" concept (Trans + Weave) lends itself to interlocking/weaving visual motif. |
| **Favicon set (ICO + SVG + Apple Touch)** | Browsers display favicons in tabs, bookmarks, and PWA installs. Missing favicon = default globe icon = looks unprofessional. Evil Martians' 2026 favicon guide recommends exactly 3 files. | LOW | Requires: `favicon.ico` (16/32/48px), `favicon.svg` (with dark mode CSS media query), `apple-touch-icon.png` (180x180). Derive all from the logo. Next.js supports file-based favicon via `app/favicon.ico`. |
| **GitHub social preview image** | When someone shares the repo link on Twitter/Discord/Slack, GitHub shows the social preview. Default generated preview looks generic. Every major project (Biome, Drizzle, shadcn) has a custom one. | LOW | Dimensions: 1280x640px (1.91:1 ratio). Include: logo, project name, tagline, brand colors. Upload via Settings > General > Social preview. |
| **Professional README with branding** | The README is the single most important branding asset -- it's what developers see first on GitHub. Tolgee's README has logo, badges, GIFs, competitive positioning, 4-step getting started. Studies show README quality directly correlates with star growth. | MEDIUM | Structure: hero image/logo, badge row, one-line description, screenshot/GIF, key features, quick start (docker-compose), comparison table, contributing link. Must be scannable in 10 seconds. |
| **README badge row** | Shields.io badges signal project health and maturity. Every credible project has 4-8 badges. Tolgee has build status, Docker, releases, license, stars. Missing badges = "is this maintained?" | LOW | Essential badges: license, version/release, Docker pulls, build status, GitHub stars. Use consistent style (flat or flat-square). Limit to 5-8 badges. shields.io is the standard. |
| **Open Graph meta tags** | When the landing page URL is shared on social media, OG tags control the preview card. Without them, platforms show random page text or nothing. | LOW | Next.js has built-in support via `metadata` export or file conventions (`opengraph-image.tsx`). Need: `og:title`, `og:description`, `og:image` (1200x630), `og:type`, `twitter:card`. |
| **Landing page with hero section** | Evil Martians' study of 100+ dev tool pages: centered hero with bold headline, supporting description, and two CTAs is the universal pattern. Biome: "One toolchain for your web project." Drizzle: "ORM for you to ship." Shadcn: "The Foundation for your Design System." A project without a landing page has no web presence beyond GitHub. | HIGH | Build as a route in the existing Next.js app OR as a separate lightweight site (Astro). Hero needs: headline, tagline, primary CTA (Get Started / docker-compose), secondary CTA (View on GitHub). |
| **Getting started section on landing page** | Every dev tool landing page shows how to start in 1-3 steps. Biome shows `npx @biomejs/biome init`. Tolgee shows `docker run`. Developers want to evaluate in under 5 minutes. | LOW | Show the docker-compose command prominently. Terminal-style code block with copy button. Must be above the fold or immediately after hero. |
| **Feature highlights on landing page** | Biome shows formatter/linter/checker with code examples. Drizzle shows performance benchmarks. Turso shows use case segmentation. Features section translates "what is this?" into "why should I use this?" | MEDIUM | Highlight 4-6 key features: AI translation, MCP server, self-hosted, team management, import/export, CLI. Each with icon, short description, and optional code/screenshot snippet. |
| **Dark/light mode support** | Biome, Drizzle, shadcn, Turso -- every modern dev tool supports dark mode by default. Developers overwhelmingly use dark themes. The existing app already uses Tailwind which supports this. | LOW | Already partially exists via Tailwind + Radix. Ensure landing page respects `prefers-color-scheme` and has a toggle. Logo/favicon must work in both modes (SVG dark mode via CSS media query). |
| **LICENSE file** | Open-source credibility requires a visible license. Shields.io badge links to it. GitHub displays it prominently. Projects without a clear license get skipped by cautious developers. | LOW | Choose MIT or Apache 2.0 (permissive, standard for dev tools). Tolgee uses Apache 2.0. Drizzle uses Apache 2.0. Add LICENSE file to repo root and badge to README. |

### Differentiators (Competitive Advantage)

Features that make Transweave stand out in a crowded space of dev tool landing pages. Not required, but create memorable first impressions and drive sharing.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Interactive demo / playground embed** | Shadcn's landing page IS a component demo. Drizzle has a playground link. Biome has a playground. An embedded or linked demo lets developers try before installing. Most i18n tools require signup -- a live playground is rare. | HIGH | Options: (a) public read-only demo instance, (b) embedded interactive widget on landing page showing translation workflow. Tolgee's demo requires account creation. A zero-auth playground is a genuine differentiator. Consider a seeded Docker instance or in-browser preview. |
| **Animated terminal / code showcase** | Drizzle uses animated code toggles. Biome shows before/after code transformation. Tolgee uses animated GIFs. Animated terminal showing `docker-compose up` then the CLI pulling translations creates a "wow" moment. | MEDIUM | Use a tool like `asciinema` or a custom React terminal component. Show: (1) docker-compose up, (2) open browser, (3) create project, (4) CLI push/pull. Embed on landing page and as GIF in README. |
| **Comparison table on landing page** | Turso and Tolgee both position against named competitors. Tolgee's GitHub README: "An open-source alternative to Crowdin, Phrase, or Lokalise." Direct comparison builds confidence. Most smaller projects are afraid to name competitors. | LOW | Table comparing Transweave vs Tolgee vs Weblate vs Crowdin on key axes: self-hosted, AI features, database flexibility, quick start time, license. Already have data from existing competitor analysis. Place on landing page and README. |
| **Dynamic OG images per page** | Most projects have a single static OG image. Next.js 15 has built-in `ImageResponse` from `next/og` that generates OG images dynamically with JSX/CSS using Satori. Each documentation page or feature page gets a unique, branded social card. | LOW | Use `opengraph-image.tsx` file convention in Next.js. Template: brand colors + logo + page title + tagline. Cached at build time. Only flexbox CSS supported. Very lightweight (500KB vs 50MB Puppeteer). |
| **Brand color system with design tokens** | Biome has its orange/yellow palette. Drizzle has its green. Tolgee has its magenta/pink. A distinct, consistent color palette across logo, landing page, docs, and OG images creates brand recognition. | LOW | Define 3-5 brand colors as CSS custom properties / Tailwind theme. Primary, secondary, accent, background, text. Apply consistently across all surfaces. The existing Tailwind + Radix setup makes this trivial to implement via theme configuration. |
| **Animated hero visual** | Biome uses mouse-tracking card animations. Drizzle has 3D layered parallax graphics and even an embedded snake game. Shadcn shows a live dashboard demo. Static hero images are forgettable; motion creates engagement. | MEDIUM | Options: (a) SVG animation of "weaving" concept, (b) live-updating translation counter, (c) particle/mesh animation reflecting the interlocking motif. Keep it subtle -- Evil Martians' study notes most dev tool pages avoid flashy interactions in favor of clean design. |
| **Starlight / Astro documentation site** | Biome, Drizzle, and hundreds of OSS projects use Astro Starlight for documentation. Built-in search (Pagefind), i18n support, dark mode, fast build, low carbon footprint. Separating docs from the app keeps architecture clean. | MEDIUM | Alternative: use the existing Next.js app for docs. Starlight advantages: purpose-built for docs, better SEO, simpler content management via MDX. But adds a second build system. Recommendation: start with docs as pages in the Next.js app; migrate to Starlight later if content grows. |
| **"Built with" / tech stack badge** | Some projects showcase their stack (Next.js, NestJS, PostgreSQL, Docker) with logo badges. Signals to developers that this uses technologies they already know and trust. | LOW | Add a small "Built with" section on landing page with tech logos. Also works as compatibility signal -- "runs on your existing PostgreSQL." |
| **Contributor-friendly onboarding** | Tolgee's README: "We're hiring engineers!" Projects with CONTRIBUTING.md, good first issues, and clear architecture docs attract contributors. Contributors become advocates. | LOW | Create: CONTRIBUTING.md, issue templates, PR template, `good-first-issue` labels. Link from README and landing page. Code of Conduct (standard Contributor Covenant). |
| **Product Hunt / Hacker News launch assets** | Star-history.com's playbook: "Show HN" posts, Product Hunt launches, and milestone celebration posts drive discovery. Having assets ready (screenshots, GIF, one-liner pitch) before launch enables rapid execution. | LOW | Prepare: 5-6 product screenshots, 1-2 GIFs, 240-char pitch, 1200x630 Product Hunt gallery images. Write "Show HN" draft. Have these ready before the public launch moment. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem valuable for branding but create maintenance burden, dilute focus, or actively harm the project's perception.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Custom documentation framework** | "Let's build our own docs system with MDX and custom components" | Massive yak-shave. Documentation frameworks are a solved problem. Building custom means maintaining search, navigation, versioning, mobile responsiveness. Every hour on the docs framework is an hour not spent on the product. | Use Next.js built-in pages for initial docs, or Astro Starlight when content volume grows. Both are proven and maintained by large communities. |
| **Elaborate marketing website separate from the app** | "We need a proper marketing site with blog, pricing, changelog, and team page" | For a v1.1 open-source project, a separate marketing site is premature. Splits engineering effort, requires separate deployment, separate domain management. Even Tolgee's landing page is a single long page, not a multi-section website. | Single-page landing with hero, features, getting started, comparison. Blog can be a GitHub discussions or dev.to posts. Changelog in CHANGELOG.md + GitHub releases. |
| **Mascot character** | "Tolgee has a parrot mascot, we should have one too" | Mascots require professional illustration, multiple poses, merch-ready variants, consistent application. Bad mascots actively hurt credibility. Only works when a project is large enough to have a visual identity team or budget for a professional illustrator. | Strong logo + color system is sufficient. Mascots are a v2+ consideration when the community is large enough to rally around one. |
| **Video content / product tour** | "Record a professional demo video for the landing page" | Video production is expensive in time. Videos become outdated quickly as UI changes. Autoplay videos annoy users. Loading large video files hurts page performance. Evil Martians' study: most dev tool pages avoid video in favor of static screenshots and code examples. | Animated GIFs or asciinema recordings for key workflows. These are faster to create, smaller to load, and easier to update. Screenshots with annotations for feature showcase. |
| **Multi-language landing page** | "We're an i18n tool, our landing page should be in 20 languages" | Ironic as it sounds, translating the landing page is premature. The primary audience is English-speaking developers. Translation maintenance becomes a burden. Broken translations are worse than no translations. | Ship English-only landing page. Add Chinese as a second language (given the team's background). Use the product itself to manage these translations as a dogfooding exercise. Other languages only if community contributes. |
| **Paid sponsorship / donation infrastructure** | "Set up Open Collective / GitHub Sponsors from day one" | Premature monetization signals. With zero stars and no community, donation buttons look desperate rather than professional. Even successful projects wait until they have traction. | Add sponsor links after reaching meaningful adoption (1000+ stars, active issues). Focus on building something worth sponsoring first. |
| **SEO-optimized blog** | "We need blog content for search ranking from day one" | Creating a blog infrastructure, writing regular content, and maintaining it is a significant ongoing commitment. For a project that hasn't launched yet, blog effort has zero ROI. | Write 1-2 launch announcement posts on dev.to, Hashnode, or Hacker News (existing platforms with built-in audiences). No custom blog until there's regular content to publish. |

## Feature Dependencies

```
[Logo (SVG source)]
    |--derives--> [Favicon set (ICO, SVG, Apple Touch)]
    |--derives--> [GitHub social preview image]
    |--derives--> [OG image template]
    |--derives--> [Landing page hero visual]
    |--derives--> [README hero image]
    └--derives--> [Brand color system]

[Brand color system]
    |--applies-to--> [Landing page design]
    |--applies-to--> [OG image template]
    └--applies-to--> [README badge styling]

[Landing page (hero + features + getting started)]
    |--requires--> [Logo]
    |--requires--> [Brand color system]
    |--requires--> [Dark/light mode support]
    |--requires--> [OG meta tags]
    └--enhances--> [README] (links to landing page)

[README rewrite]
    |--requires--> [Logo]
    |--requires--> [Badge row] (shields.io)
    |--requires--> [Screenshots / GIFs of the product]
    └--requires--> [LICENSE file]

[OG meta tags]
    |--requires--> [OG image (static or dynamic)]
    └--requires--> [Landing page deployed]

[Dynamic OG images]
    |--requires--> [Brand color system]
    |--requires--> [Logo (embedded in image)]
    └--requires--> [Next.js ImageResponse setup]

[GitHub social preview]
    |--requires--> [Logo]
    |--requires--> [Brand color system]
    └--independent (manual upload to GitHub settings)

[Comparison table]
    |--requires--> [Competitor research] (already done)
    └--enhances--> [Landing page] AND [README]

[Product screenshots / GIFs]
    |--requires--> [App running with sample data]
    |--requires--> [App rebranded to Transweave]
    └--enhances--> [README] AND [Landing page] AND [Launch assets]

[Launch assets (HN/Product Hunt)]
    |--requires--> [All of the above completed]
    |--requires--> [Product screenshots / GIFs]
    └--requires--> [One-liner pitch finalized]
```

### Dependency Notes

- **Logo is the critical dependency.** Nearly everything else (favicon, social preview, OG images, landing page hero, README header) derives from the logo. Logo design must happen first.
- **Brand color system flows from logo.** Primary brand colors are often extracted from or harmonized with the logo. Define colors immediately after logo.
- **Screenshots require the app to be rebranded.** Product screenshots showing "qlj-i18n" branding defeat the purpose. The rename must happen before (or concurrently with) screenshot capture.
- **Landing page requires logo + colors + content.** Cannot design the page without visual identity established.
- **README rewrite requires logo + badges + screenshots.** The README brings together all visual assets.
- **Launch assets are the final step.** Only prepare HN/Product Hunt materials after all branding is complete and the product is live.

## MVP Definition

### Launch With (v1.1 Branding)

Minimum branding required for a credible open-source launch.

- [ ] Logo design (SVG icon + wordmark, monochrome variant) -- everything derives from this
- [ ] Favicon set (favicon.ico, favicon.svg with dark mode, apple-touch-icon.png) -- professional browser presence
- [ ] Brand color system (primary, secondary, accent as CSS variables / Tailwind theme) -- visual consistency
- [ ] GitHub social preview image (1280x640, logo + name + tagline) -- link sharing on social media
- [ ] Static OG image for landing page (1200x630) -- social card when landing page URL is shared
- [ ] Landing page with hero, features, getting started, comparison -- web presence beyond GitHub
- [ ] README rewrite with logo, badges, screenshots/GIFs, quick start, feature highlights -- the #1 branding asset
- [ ] LICENSE file (Apache 2.0) -- open-source credibility
- [ ] Dark/light mode on landing page -- developer expectation for 2026
- [ ] OG meta tags on landing page -- social sharing support

### Add After Launch (v1.1.x)

Features to add once the initial branding is live and getting feedback.

- [ ] Dynamic OG images per documentation page -- when docs site grows beyond 5 pages
- [ ] Animated terminal / asciinema recordings -- when creating "getting started" content
- [ ] Interactive demo instance -- when wanting to reduce friction for evaluation
- [ ] Comparison table on landing page -- when traffic warrants conversion optimization
- [ ] CONTRIBUTING.md + issue templates + PR template -- when first external contributors appear
- [ ] Product Hunt / HN launch preparation -- when core branding is polished and deployed

### Future Consideration (v1.2+)

Features to defer until meaningful adoption exists.

- [ ] Astro Starlight documentation site -- when docs content exceeds what fits in the Next.js app
- [ ] Animated hero visual (SVG weaving animation) -- when landing page needs a refresh
- [ ] Contributor-facing architecture documentation -- when contributor volume warrants it
- [ ] Multi-language landing page (Chinese) -- when Chinese developer community shows interest
- [ ] Sponsor infrastructure (GitHub Sponsors / Open Collective) -- after 1000+ stars

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Logo design (SVG, multiple variants) | HIGH | MEDIUM | P1 |
| Favicon set (3 files) | HIGH | LOW | P1 |
| Brand color system | HIGH | LOW | P1 |
| README rewrite with branding | HIGH | MEDIUM | P1 |
| GitHub social preview image | HIGH | LOW | P1 |
| Landing page (hero + features + start) | HIGH | HIGH | P1 |
| OG meta tags | MEDIUM | LOW | P1 |
| Static OG image | MEDIUM | LOW | P1 |
| LICENSE file | HIGH | LOW | P1 |
| Dark/light mode on landing page | MEDIUM | LOW | P1 |
| Badge row (shields.io) | MEDIUM | LOW | P1 |
| Product screenshots / GIFs | HIGH | MEDIUM | P1 |
| Comparison table (landing + README) | MEDIUM | LOW | P2 |
| Animated terminal / code showcase | MEDIUM | MEDIUM | P2 |
| Dynamic OG images (per-page) | LOW | LOW | P2 |
| CONTRIBUTING.md + templates | MEDIUM | LOW | P2 |
| Interactive demo / playground | HIGH | HIGH | P2 |
| Launch assets (HN, Product Hunt) | HIGH | MEDIUM | P2 |
| Animated hero visual | LOW | MEDIUM | P3 |
| Astro Starlight docs site | MEDIUM | MEDIUM | P3 |
| Multi-language landing page | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for v1.1 branding launch (credible open-source presence)
- P2: Should have, add shortly after launch (growth and conversion)
- P3: Nice to have, future consideration (polish and scale)

## Competitor Branding Analysis

| Branding Element | Tolgee | Biome | Drizzle ORM | shadcn/ui | Transweave Plan |
|---------|--------|-------|-------------|-----------|-----------------|
| **Logo** | Parrot mascot + wordmark, colorful | Flame icon, orange/yellow gradient | Lightning bolt, green | Clean "shadcn" wordmark, no icon | Weaving motif icon + "Transweave" wordmark |
| **Color palette** | Magenta/pink primary, dark theme | Orange/yellow/white | Green/dark, high contrast | Neutral grays, minimal color | TBD -- aim for a distinct color not used by competitors (blue/teal territory or warm amber) |
| **Hero tagline** | "Developer & translator friendly web-based localization" | "One toolchain for your web project" | "ORM for you to ship" | "The Foundation for your Design System" | "Self-hosted i18n for teams that ship" or "Weave your translations across languages" |
| **Primary CTA** | "Get Started" + "GitHub" | "Get Started" + "View on GitHub" | "Get Started" + "Documentation" | "Get Started" + "View Components" | "Get Started" (docker-compose) + "View on GitHub" |
| **Social proof** | 8500+ users, company logos | AWS/Google/Microsoft logos | 30k+ GitHub stars, testimonial tweets | 107k GitHub stars | Start with GitHub stars badge; add user logos/quotes as adoption grows |
| **README style** | Logo + badges + GIFs + competitive positioning | Minimal, links to docs | Playful tone, benchmark data | Ultra-minimal, links to site | Logo + badges + screenshot + quick start + feature highlights + competitor comparison |
| **Dark mode** | Yes | Yes (default dark) | Yes | Yes (default light) | Yes (respect system preference, toggle available) |
| **Demo/playground** | Requires account | Browser playground | Drizzle Studio link | Site IS the demo | Seeded demo instance (stretch goal) |
| **Tech showcase** | Framework integration logos | Performance benchmarks vs Prettier | Benchmark vs Prisma, runtime logos | Live component examples | Docker quick start, AI translation demo, CLI showcase |
| **Docs approach** | Custom docs site | Starlight-style (custom) | Custom docs with sidebar | Built into main site | Start in Next.js app, evaluate Starlight later |

### Key Branding Lessons from Competitors

1. **Biome** teaches: performance claims with benchmarks create credibility. Show "5-minute setup" or "zero external dependencies" with evidence.
2. **Drizzle** teaches: personality in copy works for dev tools. "Ship" as a verb, humorous testimonials, playful tone. Transweave can be warm without being corporate.
3. **shadcn/ui** teaches: let the product demo itself. The landing page showcasing real components is more convincing than any marketing copy. Screenshots/GIFs of the actual Transweave UI are essential.
4. **Tolgee** teaches: competitive positioning directly in the README works ("open-source alternative to Crowdin, Phrase, or Lokalise"). Don't be shy about naming what you replace.
5. **Turso** teaches: segment by use case. Instead of listing all features, show "For small teams," "For enterprise," "For AI-powered workflows" -- speak to specific developer needs.

## Sources

- [Evil Martians: "We studied 100 dev tool landing pages"](https://evilmartians.com/chronicles/we-studied-100-devtool-landing-pages-here-is-what-actually-works-in-2025) - Comprehensive landing page patterns study
- [Biome landing page](https://biomejs.dev) - Hero patterns, performance benchmarks, social proof with company logos
- [Drizzle ORM landing page](https://orm.drizzle.team) - Personality in copy, benchmark comparisons, testimonial carousel, 30k stars
- [shadcn/ui landing page](https://ui.shadcn.com) - Product-as-demo pattern, minimal copy, 107k stars
- [Turso landing page](https://turso.tech) - Use case segmentation, testimonials, open source + cloud positioning
- [Tolgee GitHub README](https://github.com/tolgee/tolgee-platform) - Badge strategy, GIF demos, competitive positioning, hiring callout
- [GitHub Docs: Social media preview](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview) - 1280x640 recommended
- [Next.js Metadata and OG images](https://nextjs.org/docs/app/getting-started/metadata-and-og-images) - Built-in ImageResponse, opengraph-image.tsx convention
- [Evil Martians: How to Favicon in 2026](https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs) - 3-file favicon strategy (ICO + SVG + Apple Touch)
- [Shields.io](https://shields.io/) - Badge generation service, 1.6B images/month
- [daily.dev: README Badges Best Practices](https://daily.dev/blog/readme-badges-github-best-practices) - 5-8 badges, consistent style, relevant metrics
- [Star History: Playbook for GitHub Stars](https://www.star-history.com/blog/playbook-for-more-github-stars) - README optimization, launch strategy, community engagement
- [Astro Starlight](https://starlight.astro.build/) - Documentation site framework with built-in search, i18n, dark mode
- [Vercel OG Image Generation](https://vercel.com/docs/functions/og-image-generation) - ImageResponse API, Satori engine, 500KB vs 50MB Puppeteer
- [GitHub Blog: Framework for building OG images](https://github.blog/open-source/git/framework-building-open-graph-images/) - OG image architecture patterns

---
*Feature research for: Open-source developer tool branding and promotion*
*Researched: 2026-03-01*
