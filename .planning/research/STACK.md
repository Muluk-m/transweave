# Technology Stack: v1.1 Branding & Promotion

**Project:** Transweave v1.1 Branding & Promotion Milestone
**Researched:** 2026-03-01
**Overall Confidence:** HIGH

## Executive Decision

**Zero new runtime dependencies.** The existing Next.js 15 stack has built-in support for everything this milestone needs: OG image generation (`next/og`), favicon file conventions, route groups for landing page isolation, and the `motion` library (already installed) for scroll animations. Add only `sharp` (dev dependency, recommended by Next.js for production image optimization) and optionally `sharp-ico` for one-time ICO file generation.

This milestone is a restructuring and content task, not a technology task. The stack additions are minimal by design.

---

## Recommended Stack Additions

### 1. OG Image Generation -- Zero New Dependencies

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `next/og` (built-in) | Bundled with Next.js 15.2.6 | Open Graph and Twitter card image generation | Built into Next.js since v13.3.0. Uses `ImageResponse` API backed by Satori + resvg internally. Renders JSX to PNG with flexbox layout support. No additional packages needed. |

**How it integrates:**

Create `app/opengraph-image.tsx` (or `app/(marketing)/opengraph-image.tsx`) that exports a default function returning `new ImageResponse(...)`. Next.js automatically discovers the file and generates `<meta property="og:image">` tags in the HTML `<head>`. Images are statically optimized at build time by default -- no runtime cost.

```typescript
// app/(marketing)/opengraph-image.tsx
import { ImageResponse } from 'next/og'

export const alt = 'Transweave - Self-hosted i18n management'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    <div style={{ /* branded layout with logo, tagline, gradient background */ }}>
      Transweave
    </div>,
    { ...size }
  )
}
```

**Key constraints of `next/og` ImageResponse:**
- Only flexbox layout (no CSS Grid)
- Subset of CSS properties (no `box-shadow`, limited `background`)
- Custom fonts must be loaded as ArrayBuffer/Uint8Array (not CSS `@font-face`)
- SVG can be embedded as `<img src>` with base64 data URI

**Confidence:** HIGH -- verified against [Next.js Official Docs v16.1.6](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image), updated 2026-02-27. Stable API since v13.3.0.

---

### 2. Favicon Handling -- Zero New Dependencies

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js metadata file conventions (built-in) | Bundled with Next.js 15.2.6 | Favicon, icon, apple-icon auto-discovery | Place correctly-named files in `app/` directory. Next.js auto-generates `<link>` tags with correct `rel`, `type`, `sizes` attributes. No configuration needed. |

**The 3-file favicon strategy (2026 best practice):**

| File | Placement | Purpose | Generated HTML |
|------|-----------|---------|---------------|
| `app/favicon.ico` | Root `app/` only | Legacy browsers (32x32 multi-size) | `<link rel="icon" href="/favicon.ico" sizes="any">` |
| `app/icon.svg` | `app/` or any segment | Modern browsers (scalable vector) | `<link rel="icon" href="/icon?..." type="image/svg+xml">` |
| `app/apple-icon.png` | `app/` or any segment | Apple devices (180x180) | `<link rel="apple-touch-icon" href="/apple-icon?..." sizes="180x180">` |

**SVG favicon dark mode support:** The `icon.svg` can contain CSS `@media (prefers-color-scheme: dark)` queries to automatically switch colors between light and dark system themes. Supported by 95%+ of browsers in 2026.

**Current state:** The project already has `public/favicon.svg` and `public/logo.svg` but these use the old `qlj-logo-gradient` ID and are served from `/public` (not using the Next.js file convention). Move the new Transweave logo SVG to `app/icon.svg` to use the auto-discovery mechanism.

**Confidence:** HIGH -- verified against [Next.js favicon/icon/apple-icon docs](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons) (v16.1.6, updated 2026-02-27) and [Evil Martians favicon guide](https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs).

---

### 3. Landing Page -- Zero New Dependencies

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js Route Groups (built-in) | Bundled with Next.js 15.2.6 | Separate marketing layout from app layout | `(marketing)` route group gets a clean public layout (no AuthProvider, no HeaderManager). `(app)` route group keeps current authenticated layout. Both share same deployment. |
| `motion` (already installed) | ^12.18.1 | Scroll animations, hero transitions, staggered reveals | Already in `packages/web/package.json`. Provides `motion.div`, `useScroll`, `useInView`, viewport-triggered animations. The library was renamed from framer-motion. |
| Tailwind CSS (already installed) | ^3.4.1 | Landing page styling, responsive design | Already configured with custom animations (`fade-in-up`, `shimmer`, `pulse-soft`), gradient backgrounds (`gradient-radial`, `gradient-conic`), and glow shadows. |
| `lucide-react` (already installed) | ^0.428.0 | Feature card icons | Already installed. Consistent icon set for feature sections. |
| `next/font` (built-in) | Bundled with Next.js 15.2.6 | Font loading for display headings | Already using `Inter` via `next/font/google`. Can add a display font (e.g., `Inter` at heavier weights or a serif for contrast) without new packages. |

**Route Group Architecture:**

```
app/
  layout.tsx                    # Minimal shared root (html, body, font, Toaster)
  (marketing)/
    layout.tsx                  # Marketing layout (no auth, marketing nav/footer)
    page.tsx                    # Landing page at "/"
    opengraph-image.tsx         # OG image for social sharing
  (app)/
    layout.tsx                  # App layout (AuthProvider, HeaderManager, I18nClientProvider, NuqsAdapter)
    login/page.tsx
    signup/page.tsx
    teams/page.tsx
    team/[teamId]/page.tsx
    project/[projectId]/page.tsx
    ... (all other app routes)
  favicon.ico
  icon.svg
  apple-icon.png
```

**Critical integration detail:** The current `app/layout.tsx` wraps everything in `AuthProvider`, `HeaderManager`, `I18nClientProvider`, and `NuqsAdapter`. The landing page must NOT be wrapped in these -- it is a public marketing page. Splitting into route groups isolates the auth/app chrome from the public page.

**Navigation between groups:** Moving between `(marketing)` and `(app)` route groups with different root layouts triggers a full page reload. This is acceptable because the transition point is "Get Started" -> `/login`, which is a natural context switch.

**Current `app/page.tsx` behavior:** Currently redirects authenticated users to `/teams` and unauthenticated users to `/login`. In the new structure, `(marketing)/page.tsx` becomes the public landing page at `/`. The redirect logic is no longer needed at root.

**Confidence:** HIGH -- Route Groups are a stable Next.js feature since v13.0. Verified against [Next.js Route Groups docs](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups) and [Public Static Pages guide](https://nextjs.org/docs/app/guides/public-static-pages).

---

### 4. Production Image Optimization -- One New Dev Dependency

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `sharp` | ^0.33 | Production image optimization for `next/image` | Next.js strongly recommends sharp for production deployments. Needed for optimizing landing page images (screenshots, feature demos) served via `<Image>`. Already required by Next.js standalone output mode. |

**Note:** `sharp` is NOT needed for OG image generation (`next/og` uses satori+resvg internally). It IS needed for the `next/image` component optimization pipeline in production.

**Confidence:** HIGH -- per [Next.js official recommendation](https://nextjs.org/docs/messages/install-sharp): "For production Image Optimization with Next.js, the optional 'sharp' package is strongly recommended."

---

### 5. Favicon Asset Generation -- One-Time Dev Script

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `sharp` (same as above) | ^0.33 | Convert SVG logo to apple-icon.png (180x180) | Reuse sharp (already needed for Next.js image optimization) to generate the PNG apple-touch-icon from the SVG source. One-time script, not a runtime dependency. |
| `sharp-ico` (optional) | ^0.1 | Encode PNG to ICO format | Small addon that adds `.ico` output to sharp. Only needed if generating `favicon.ico` programmatically via script. |

**Why not the `favicons` npm package:** The `favicons` package (v7.2.0, last published 2+ years ago) generates 30+ files for every platform. We need exactly 3 files. Sharp is already needed for Next.js, so reuse it.

**Alternative approach (equally valid):** Use any online favicon generator (realfavicongenerator.net) once, download the 3 files, commit them. No build script needed. The manual approach is simpler if you only generate favicons once.

**Confidence:** MEDIUM -- Both approaches work. The script approach is reproducible; the manual approach is simpler.

---

## Project Renaming -- Zero New Dependencies

The rename from `qlj-i18n` to `transweave` is a search-and-replace operation across the monorepo. No tooling needed beyond a text editor.

### Package Name Changes

| File | Current `name` | New `name` |
|------|---------------|------------|
| `package.json` (root) | `@qlj/i18n-manager` | `@transweave/monorepo` |
| `packages/web/package.json` | `nextjs` | `@transweave/web` |
| `packages/server/package.json` | `qlj-i18n-server` | `@transweave/server` |
| `packages/cli/package.json` | `qlj-i18n` | `transweave` |

### Build/Deploy Reference Changes

| File | What Changes |
|------|-------------|
| `packages/cli/package.json` `bin` field | `"qlj-i18n": "./bin/qlj-i18n.js"` -> `"transweave": "./bin/transweave.js"` |
| `packages/cli/bin/qlj-i18n.js` | Rename file to `transweave.js` |
| `packages/server/Dockerfile` | `pnpm --filter qlj-i18n-server` -> `pnpm --filter @transweave/server` |
| `packages/web/Dockerfile` | `pnpm --filter nextjs` -> `pnpm --filter @transweave/web` |
| `docker-compose.yml` | Service/image names can optionally update |
| `packages/web/app/layout.tsx` | `title: "i18n Manager"` -> `title: "Transweave"` |

### Code Reference Changes (16 files)

Files containing `qlj-i18n`, `qlj_i18n`, or `@qlj/` (excluding `node_modules`):

| Category | Files |
|----------|-------|
| CLI source | `packages/cli/src/index.ts`, `src/commands/push.ts`, `src/commands/pull.ts`, `src/commands/init.ts`, `src/config.ts` |
| MCP | `packages/server/src/service/mcp.service.ts`, `packages/server/src/controller/mcp.controller.ts` |
| Server | `packages/server/src/ai/encryption.util.ts` |
| Config | `.env.example` |
| Docs | `README.md`, `docs/api-reference.md` |
| i18n strings | `packages/web/i18n/all.json` |

**Confidence:** HIGH -- based on exhaustive grep of the codebase.

---

## What NOT to Add

| Do NOT Add | Why | What to Do Instead |
|------------|-----|-------------------|
| Separate static site (Astro, Docusaurus, VitePress) | Creates a second deployment, second build pipeline, second hosting concern. Massive overhead for a single landing page. | Use Next.js route groups. One deployment, one build. |
| `@vercel/og` npm package | Already bundled inside `next/og`. Installing it separately creates a duplicate. | `import { ImageResponse } from 'next/og'` |
| SVG generation/manipulation libraries (svg.js, d3, Inkscape bindings) | Logo design is a creative/design task, not a code generation task. The existing SVG files are hand-authored. | Design the logo SVG manually (or with a design tool like Figma), save as `.svg` file. |
| Headless CMS (Contentful, Sanity, Strapi) | Landing page content is static marketing copy that changes rarely. CMS adds deployment complexity and a runtime dependency. | Hardcode content in JSX. Update by editing the component. |
| Image CDN (Cloudinary, imgix) | OG images are statically generated at build time. Landing page images use `next/image` with local optimization. No external image service needed. | Serve images from the same Next.js origin. |
| `canvas` or `node-canvas` | Heavy native dependency (Cairo, Pango). Requires system-level C libraries. | `next/og` uses satori+resvg which are lighter and WASM-based. |
| `favicons` npm package | Generates 30+ favicon files for every platform. Overkill when only 3 files are needed. Last published 2+ years ago. | `sharp` + `sharp-ico` for programmatic generation, or use an online tool once. |
| CSS-in-JS (styled-components, emotion) | Tailwind CSS is the established styling solution. Adding CSS-in-JS fragments the styling approach. | Tailwind CSS for all styling including the landing page. |
| Additional font packages (Fontsource, Google Fonts CDN) | `next/font` already handles font loading with automatic optimization and self-hosting. Inter is configured. | Use `next/font/google` or `next/font/local` for any additional brand fonts. |
| PWA manifest generator | Out of scope for branding milestone. | Add `manifest.json` manually later if PWA support is desired. |
| Sentry/analytics for landing page | Out of scope. Landing page is static content. | Can be added in a future milestone if needed. |

---

## Existing Assets to Clean Up

| Current File | Action | Reason |
|-------------|--------|--------|
| `public/favicon.svg` | Replace with new Transweave logo | Contains `qlj-logo-gradient` ID. Also move to `app/icon.svg` for Next.js convention. |
| `public/logo.svg` | Replace with new Transweave logo | Same old gradient ID. Keep in `public/` for use in components via `<Image>`. |
| `public/next.svg` | Delete | Next.js boilerplate file, not used. |
| `public/vercel.svg` | Delete | Vercel boilerplate file, not used. |
| `public/fanyi.webp` | Delete or replace | Chinese translation-related image from internal version. |
| `public/tutu.jpg` | Delete | Appears to be internal/personal image. |

---

## Installation

```bash
# Dev dependencies only -- add to packages/web
pnpm --filter @transweave/web add -D sharp

# Optional: for programmatic ICO generation (one-time script)
pnpm --filter @transweave/web add -D sharp-ico
```

**Total new dependencies: 1-2 dev-only packages. Zero new runtime dependencies.**

---

## Version Compatibility

| Package | Version | Compatible With | Source |
|---------|---------|-----------------|--------|
| `next/og` | Bundled with 15.2.6 | React 19, Node 22 | [Next.js docs](https://nextjs.org/docs/app/api-reference/functions/image-response) |
| `sharp` | ^0.33 | Node 18+, linux/darwin/win | [sharp.pixelplumbing.com](https://sharp.pixelplumbing.com/) |
| `sharp-ico` | ^0.1 | `sharp` ^0.33 | [npm](https://www.npmjs.com/package/sharp-ico) |
| `motion` | ^12.18.1 (installed) | React 19 | [motion.dev](https://motion.dev/) |
| Next.js file conventions | Since v13.3.0 | All Next.js 13+ | [Next.js docs](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons) |
| Next.js Route Groups | Since v13.0 | All Next.js 13+ | [Next.js docs](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups) |

---

## Sources

- [Next.js: opengraph-image and twitter-image file conventions](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image) -- Official docs v16.1.6, updated 2026-02-27
- [Next.js: ImageResponse API](https://nextjs.org/docs/app/api-reference/functions/image-response) -- Official docs
- [Next.js: favicon, icon, and apple-icon file conventions](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons) -- Official docs v16.1.6, updated 2026-02-27
- [Next.js: Route Groups](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups) -- Official docs
- [Next.js: Building Public/Static Pages](https://nextjs.org/docs/app/guides/public-static-pages) -- Official guide v16.1.6
- [Next.js: Install Sharp recommendation](https://nextjs.org/docs/messages/install-sharp) -- Official docs
- [How to Favicon in 2026: Three Files](https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs) -- Evil Martians (updated for 2026)
- [Favicon Formats and Best Practices 2026](https://favicon.im/blog/favicon-formats-sizes-best-practices) -- Favicon.im
- [Motion (formerly Framer Motion)](https://motion.dev/) -- Official site
- [sharp](https://sharp.pixelplumbing.com/) -- Official documentation
- [sharp-ico](https://www.npmjs.com/package/sharp-ico) -- npm package

---
*Stack research for: Transweave v1.1 Branding & Promotion milestone*
*Researched: 2026-03-01*
