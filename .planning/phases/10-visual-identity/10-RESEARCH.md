# Phase 10: Visual Identity - Research

**Researched:** 2026-03-02
**Domain:** SVG logo design, Next.js favicon file conventions, Tailwind CSS brand color extension, GitHub social preview
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| VIS-01 | Project has an SVG logo with icon + wordmark variant | SVG authoring patterns, weaving motif geometry, wordmark typography via SVG `<text>` |
| VIS-02 | Project has an icon-only logo variant (for favicon and small contexts) | Same SVG source simplified; minimum viable design at 16px |
| VIS-03 | Favicon set generated from logo (favicon.ico, favicon.svg with dark mode, apple-touch-icon.png) | Next.js app/ file conventions, sharp for PNG generation, dark mode via SVG CSS media query |
| VIS-04 | Brand color system defined as Tailwind theme extension and CSS custom properties | tailwind.config.ts `theme.extend.colors`, globals.css `:root` custom properties; existing token pattern already present |
| VIS-05 | GitHub social preview image uploaded (1280x640px with logo and tagline) | 1280x640 PNG spec, GitHub Settings > Social preview manual upload process |
</phase_requirements>

---

## Summary

Phase 10 creates the visual identity foundation for the Transweave brand. The work has five distinct deliverables that flow in order: logo SVG (the primary source) → favicon set derived from it → brand color tokens → icon-only variant embedded in Next.js favicon conventions → social preview image for GitHub.

The project already has a workable starting point: `public/logo.svg` and `public/favicon.svg` are a blue gradient icon with a globe-search visual. The new Transweave identity replaces this with a "weaving" motif — interlocking threads representing multi-language integration. The existing Tailwind config already uses CSS custom properties via `hsl(var(--X))` tokens, so adding brand-specific colors follows an established, working pattern. Next.js 15 has built-in favicon file conventions that auto-generate `<link>` tags when files are placed at `app/favicon.ico`, `app/icon.svg`, and `app/apple-icon.png`.

**Primary recommendation:** Design the icon-only SVG first (the weaving motif at 32x32 viewBox), derive all other assets from it. Use a teal/indigo palette that is distinct from competitors (Tolgee is magenta, Biome is orange, Drizzle is green). Add brand color tokens as a named `brand` scale in Tailwind that does not conflict with the existing `primary`/`accent` semantic tokens.

---

## Standard Stack

### Core (No New Dependencies)

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Next.js file conventions (built-in) | Bundled with 15.2.6 | Auto-generate favicon `<link>` tags from files placed in `app/` | Zero config — place correctly-named files and Next.js handles the HTML. Verified against Next.js docs v16.1.6. |
| Tailwind CSS (already installed) | ^3.4.1 | Brand color tokens, theme extension | Already configured with full token system via `hsl(var(--X))` pattern. |
| SVG (no library) | Native | Logo and icon source files | Logos are hand-authored SVGs — no library needed. Keep as minimal, optimized SVG source. |

### Supporting (One-Time Generation Tools)

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| `sharp` (dev dependency) | ^0.33 | Convert SVG to 180x180 PNG for `apple-icon.png` | Run once as a generation script; already recommended by Next.js for image optimization |
| `sharp-ico` (optional dev dependency) | ^0.1 | Encode 32x32 PNG frames to `.ico` format | Only needed for programmatic ICO generation; can use an online tool instead |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual ICO creation (online tool) | `sharp-ico` script | Online tools (realfavicongenerator.net) are faster one-time; script is reproducible. Either works. |
| Custom SVG in `public/` served via `<img>` | `app/icon.svg` file convention | File convention auto-generates proper `<link>` tags with correct `type="image/svg+xml"` and hash-based cache busting. Use the convention. |
| Inline SVG in Logo.tsx only | Separate canonical SVG files | Current approach has logo embedded in JSX only. Phase 10 creates standalone SVG files as the canonical source. |

**Installation (if using programmatic ICO generation):**
```bash
pnpm --filter @transweave/web add -D sharp sharp-ico
```

---

## Architecture Patterns

### Recommended File Layout

```
packages/web/
  app/
    favicon.ico          # 32x32 multi-size ICO — root app/ only
    icon.svg             # Scalable SVG with dark mode support — replaces public/favicon.svg
    apple-icon.png       # 180x180 PNG — generated from icon SVG
    layout.tsx           # Update metadata: title, description, openGraph
  public/
    logo.svg             # Icon-only SVG — for use in <Image> and Logo.tsx
    logo-wordmark.svg    # Icon + wordmark SVG — for README/docs/OG image headers
    og-image.png         # Social preview fallback (1280x640) — for GitHub AND layout.tsx OG tag
  components/
    Logo.tsx             # Update: reference new SVG, update "Qlj i18n" text to "Transweave"
assets/                  # Repo root — canonical brand source files (not served)
  icon-source.svg        # The canonical icon SVG (the "true source")
  brand.md               # Hex values, usage rules, font name
```

**Key layout decisions:**
- `app/icon.svg` is the Next.js favicon convention file (auto-linked in `<head>`)
- `public/logo.svg` is the public-facing asset for `<Image>` usage in components
- `assets/` at repo root is the design source of truth — everything else is derived from it
- `app/og-image.png` would trigger Next.js's opengraph-image convention — use `public/og-image.png` referenced via layout.tsx metadata instead, to avoid conflict with Phase 12's dynamic `opengraph-image.tsx`

### Pattern 1: Next.js Favicon File Convention

**What:** Place three files in `app/` directory; Next.js auto-generates all `<link>` tags
**When to use:** Always for Next.js 13+ App Router projects

```typescript
// Result in <head> — generated automatically by Next.js:
// <link rel="icon" href="/favicon.ico" sizes="any" />
// <link rel="icon" href="/icon?<hash>" type="image/svg+xml" />
// <link rel="apple-touch-icon" href="/apple-icon?<hash>" sizes="180x180" />

// File placement:
// app/favicon.ico     → <link rel="icon" sizes="any">  (legacy browsers)
// app/icon.svg        → <link rel="icon" type="image/svg+xml"> (modern)
// app/apple-icon.png  → <link rel="apple-touch-icon" sizes="180x180">
```

Source: [Next.js favicon/icon/apple-icon docs](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons) — verified v16.1.6 (2026-02-27)

### Pattern 2: SVG Favicon with Dark Mode

**What:** `icon.svg` can contain a CSS `@media (prefers-color-scheme: dark)` block to switch colors automatically
**When to use:** In `app/icon.svg` — supported by 95%+ of modern browsers in 2026

```xml
<!-- app/icon.svg — the favicon served by Next.js file convention -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <style>
    .icon-bg { fill: #0EA5E9; }           /* teal for light mode */
    @media (prefers-color-scheme: dark) {
      .icon-bg { fill: #38BDF8; }         /* lighter teal for dark backgrounds */
    }
  </style>
  <rect width="32" height="32" rx="8" class="icon-bg"/>
  <!-- weaving motif paths here -->
</svg>
```

Source: [Evil Martians favicon guide 2026](https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs) — MEDIUM confidence (official Next.js docs do not explicitly document the media query, but browser support is well-documented)

### Pattern 3: Tailwind Brand Color Extension

**What:** Add a named `brand` scale to `tailwind.config.ts` that coexists with existing semantic tokens (`primary`, `accent`, etc.)
**When to use:** When you need hard-coded brand palette values that are not context-dependent (unlike semantic tokens which change in dark mode)

```typescript
// packages/web/tailwind.config.ts — add inside theme.extend.colors
brand: {
  teal: {
    50:  '#f0fdfa',
    100: '#ccfbf1',
    400: '#2dd4bf',
    500: '#14b8a6',  // primary brand color
    600: '#0d9488',
    900: '#134e4a',
  },
  indigo: {
    500: '#6366f1',  // secondary brand color
    600: '#4f46e5',
  },
},
```

Then in `globals.css`, add brand-specific custom properties in `:root`:

```css
/* globals.css — add to :root block */

/* Transweave brand colors (static, not semantic) */
--brand-teal: 173 80% 40%;          /* hsl(173, 80%, 40%) = #14b8a6 teal */
--brand-teal-light: 173 80% 94%;    /* teal 50 */
--brand-indigo: 239 84% 67%;        /* hsl(239, 84%, 67%) = #6366f1 indigo */
--brand-gradient-start: #14b8a6;    /* teal */
--brand-gradient-end: #6366f1;      /* indigo */
```

**Why a separate `brand` scale:** The existing `primary` token (`--primary: 243 75% 59%` = indigo/violet) is already close to the recommended palette. The distinction: `primary` is semantic (used by Radix UI components and adapts to dark mode), `brand` is fixed (used in logo, OG images, marketing surfaces). Do not change `primary` — it would break all Radix/shadcn component styling.

Source: Verified directly against current `tailwind.config.ts` and `globals.css` in the project. HIGH confidence.

### Pattern 4: SVG Logo Structure (Icon-Only)

**What:** The Transweave icon should visually communicate "weaving" — interlocking threads or warp-and-weft grid
**Geometric approach:** Two or three diagonal "threads" crossing through a square or circular container

```xml
<!-- Conceptual structure for the weaving icon (32x32 viewBox) -->
<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <!-- Container square with rounded corners -->
  <rect width="32" height="32" rx="6" fill="url(#brand-gradient)"/>

  <!-- Weaving motif: 3 horizontal "weft" bands crossing 2 vertical "warp" threads -->
  <!-- Achieved with overlapping rounded rectangles at 45-degree angles -->
  <!-- OR: overlapping diagonal paths creating an "over-under" weave pattern -->

  <defs>
    <linearGradient id="brand-gradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
      <stop stop-color="#14b8a6"/>    <!-- teal -->
      <stop offset="1" stop-color="#6366f1"/>  <!-- indigo -->
    </linearGradient>
  </defs>
</svg>
```

**Concrete weave motif options (ranked by clarity at small sizes):**

1. **Interlocked rings** — Two or three interlocked circles (like a Venn/chain). Clean at 16px. Symbolizes multi-language integration. Simple path math.
2. **Three diagonal stripes with over-under** — Three diagonal bands, with the middle one "going under" via clipping. Literal weave metaphor. Harder to read at 16px.
3. **Grid with overlapping lines** — A 3x3 grid where some nodes are highlighted. Translation management metaphor. Readable at all sizes.
4. **T letterform stylized** — A "T" for Transweave with woven texture detail. Fast to recognize as an icon, less abstract.

**Recommendation:** Interlocked rings or stylized "T" with woven detail. Both read at 16px (favicon) and scale to 512px hero clearly.

### Pattern 5: Wordmark SVG Structure

**What:** Icon + "Transweave" text as a single SVG file
**When to use:** README header, documentation, large surfaces where brand name is needed

```xml
<!-- logo-wordmark.svg — icon left, text right -->
<svg viewBox="0 0 160 32" xmlns="http://www.w3.org/2000/svg">
  <!-- Icon (32x32 at left) -->
  <g transform="translate(0, 0)">
    <!-- paste icon paths here -->
  </g>
  <!-- Wordmark text -->
  <text
    x="40" y="22"
    font-family="Inter, -apple-system, sans-serif"
    font-weight="600"
    font-size="18"
    fill="currentColor"
    letter-spacing="-0.3"
  >Transweave</text>
</svg>
```

**Alternative:** Keep the wordmark as a React component (`Logo.tsx`) that renders the icon SVG inline + a styled `<span>`. This is more maintainable than a wordmark SVG because font rendering in SVG varies across environments. For README/OG images where a standalone file is needed, export a PNG of the wordmark.

### Anti-Patterns to Avoid

- **Embedding `qlj-logo-gradient` ID in multiple SVG files:** SVG gradient IDs must be unique per page. If multiple SVGs with the same gradient ID are inlined on the same HTML page, the second one will use the first one's gradient. The existing `Logo.tsx` and `public/favicon.svg` both use `qlj-logo-gradient` — this is a known bug. Solution: use unique IDs (`tw-logo-gradient`) or use `fill` with a direct color value instead of a `<defs>` reference where possible.
- **Using `fill="url(#id)"` in SVGs placed via `<img>` tag:** External gradient `<defs>` references do not work when an SVG is loaded as an `<img>` source. Use `fill` with direct hex/hsl values, or SVG `paint-server` within the file itself.
- **Designing only at 512px:** Always verify the icon reads at 16px (favicon), 32px (browser tab), 64px (high-DPI favicon), 180px (apple-touch-icon), and 512px (hero). Complex path details invisible at 16px should be removed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Favicon auto-linking in `<head>` | Custom `<Head>` metadata | Next.js app/ file conventions (`app/favicon.ico`, `app/icon.svg`, `app/apple-icon.png`) | File convention generates correct `rel`, `type`, `sizes` automatically. No config needed. |
| PNG generation from SVG | Custom canvas/puppeteer script | `sharp` + one-time Node script | Sharp is already needed for Next.js image optimization; reusing it is trivial. No Puppeteer (50MB+ native dep). |
| ICO file creation | Custom binary encoder | Online tool (realfavicongenerator.net) or `sharp-ico` | ICO is a trivial multi-size PNG container. One-time creation, not worth custom code. |
| Color token system | Custom CSS variable naming scheme | Tailwind's existing `hsl(var(--X))` pattern (already in use) | The project already has a working, tested token system. New tokens slot in identically. |
| Wordmark SVG with embedded font | Font-subsetted SVG | React component with `<span>` text | Font rendering in SVG varies by viewer. Text-as-shapes requires Figma. React component is reliable and maintainable. |

**Key insight:** SVG favicon dark mode, PNG generation, and favicon linking are all solved problems with built-in or minimal tooling. The creative work (logo design) is what cannot be automated — invest effort there, not in infrastructure.

---

## Common Pitfalls

### Pitfall 1: SVG Gradient ID Collision

**What goes wrong:** Multiple SVGs with `id="qlj-logo-gradient"` (or any shared ID) inlined on the same HTML page causes the second gradient to reference the first one's definition. The favicon and Logo.tsx currently share this ID.

**Why it happens:** SVG IDs are globally scoped within an HTML document. When multiple SVGs are inlined, all IDs must be unique.

**How to avoid:** Use a unique, project-specific ID in the new SVGs: `id="tw-icon-gradient"`. Since the icon SVG will also be used as `app/icon.svg` (loaded via `<link>`, not inlined), the collision only affects `Logo.tsx`. The `Logo.tsx` component should use a unique ID or use `fill` with a direct gradient defined inside the component itself.

**Warning signs:** Icon and favicon showing wrong colors; gradient pointing to wrong element.

### Pitfall 2: `app/` vs `public/` Favicon Confusion

**What goes wrong:** Placing favicons in `public/` does NOT trigger Next.js file conventions. The old `public/favicon.svg` is served at `/favicon.svg` but generates no `<link>` tags in `<head>`. Browsers must discover it via the HTML head, not just by requesting `/favicon.ico`.

**Why it happens:** Developers assume `public/` is equivalent to `app/` for metadata. It is not — `public/` is a static file server, `app/` is the metadata file convention system.

**How to avoid:** Put `favicon.ico`, `icon.svg`, and `apple-icon.png` in `app/` root (NOT in `app/(landing)/` or any route group subdirectory, since these are global favicons). The files in `app/` must be at the root level to apply globally across all routes.

**Warning signs:** Browser tab still shows old favicon; no `<link rel="icon">` in page source.

### Pitfall 3: ICO File is NOT Just a Renamed PNG

**What goes wrong:** Renaming a PNG file to `.ico` creates an invalid ICO file that most browsers silently ignore. A valid `.ico` file is a container format holding one or more PNG frames (typically 16x16 and 32x32).

**Why it happens:** Developers assume file extension = file format.

**How to avoid:** Generate the ICO file using `sharp-ico` (programmatic) or realfavicongenerator.net (online, free). Both produce valid multi-size ICO containers.

**Warning signs:** `file favicon.ico` reports "PNG image" not "MS Windows icon"; `hexdump -n 4 favicon.ico` shows `89 50 4E 47` (PNG magic bytes) instead of `00 00 01 00` (ICO magic bytes).

### Pitfall 4: Tailwind Brand Colors Conflicting with Radix Semantic Tokens

**What goes wrong:** Changing the existing `--primary` or `--accent` CSS custom properties to match the new brand colors breaks all Radix UI components that derive their color from these variables (buttons, inputs, focus rings, etc.).

**Why it happens:** The `primary`/`accent` tokens feed into Radix UI's color system via the Tailwind classes. They are not cosmetic — they control interactive state colors throughout the app.

**How to avoid:** DO NOT modify `--primary` or `--accent` in Phase 10. Add NEW brand-specific custom properties (`--brand-teal`, `--brand-indigo`) alongside the existing tokens. If the brand colors and the Radix semantic colors should align, align them — but test every interactive component after doing so.

**Warning signs:** Buttons, focus rings, or form inputs change color unexpectedly; Radix component variants stop working.

### Pitfall 5: Social Preview Image Dimensions Wrong

**What goes wrong:** GitHub recommends 1280x640px for social preview images. The minimum is 640x320. Using 1200x630 (common OG image size) technically works but GitHub crops/scales it differently.

**Why it happens:** Confusion between GitHub social preview spec (1280x640, 2:1 ratio) and OG image spec (1200x630, ~1.91:1 ratio). These are different contexts.

**How to avoid:**
- GitHub repo social preview: exactly **1280x640px PNG** (2:1 ratio), uploaded via Settings > Social preview
- OG meta tag image for landing page: **1200x630px PNG** (1.91:1 ratio), referenced in layout.tsx metadata
- These are two different files for two different purposes

**Warning signs:** Social preview on Twitter/Discord looks cropped; GitHub repo preview shows blank/wrong image.

### Pitfall 6: Logo Not Readable at 16px Favicon Size

**What goes wrong:** A beautiful 512px logo with fine detail, thin strokes, and multiple overlapping elements becomes an indistinguishable blob at 16px.

**Why it happens:** Logo designed at large scale without testing small sizes.

**How to avoid:**
1. Design the icon at 32x32 viewBox with paths that have a minimum stroke width of 2px equivalent
2. Avoid more than 3-4 distinct shapes at any size
3. Test by placing a 16x16 preview in a dark browser tab background
4. At 16px: only the silhouette and dominant color read. Design for that.

**Warning signs:** Favicon looks like a colored square; distinctive icon shape not visible in browser tab.

### Pitfall 7: Logo.tsx Inline SVG ID Not Updated

**What goes wrong:** After creating new SVG files, the `Logo.tsx` component still contains the old inline SVG with `id="qlj-logo-gradient"` and `Qlj i18n` text. The favicon changes but the in-app logo (sidebar, login page) remains the old design.

**Why it happens:** `Logo.tsx` is a React component with inline SVG paths — it is a separate artifact from the `.svg` files. Easy to forget.

**How to avoid:** Phase 10 MUST update `Logo.tsx`: new icon paths, new gradient ID (`tw-icon-gradient`), new wordmark text ("Transweave").

**Warning signs:** App header shows old globe-search icon while browser tab shows new weaving icon.

---

## Code Examples

### Tailwind Config Brand Extension

```typescript
// packages/web/tailwind.config.ts — add to theme.extend.colors
brand: {
  teal: '#14b8a6',      // Tailwind teal-500 — primary brand
  'teal-light': '#ccfbf1',  // For backgrounds, badges
  indigo: '#6366f1',    // Tailwind indigo-500 — secondary brand
  'indigo-dark': '#4338ca', // For hover states
},
```

### globals.css Brand Custom Properties

```css
/* packages/web/app/globals.css — add to :root block */

/* Transweave brand identity (stable across light/dark mode) */
--brand-teal: 173 80% 40%;
--brand-teal-50: 166 76% 97%;
--brand-indigo: 239 84% 67%;
--brand-gradient-start: #14b8a6;
--brand-gradient-end: #6366f1;
```

### Next.js Layout Metadata Update

```typescript
// packages/web/app/layout.tsx — update metadata export
export const metadata: Metadata = {
  title: "Transweave",
  description:
    "Self-hosted i18n management platform for development teams. Manage multilingual translations with AI, CLI, and team collaboration.",
  openGraph: {
    title: "Transweave",
    description: "Self-hosted i18n management for teams that ship.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Transweave",
    description: "Self-hosted i18n management for teams that ship.",
    images: ["/og-image.png"],
  },
};
```

Source: Verified against project's existing `app/layout.tsx` and [Next.js metadata docs](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)

### SVG Icon Dark Mode Pattern

```xml
<!-- app/icon.svg — Transweave favicon with dark mode support -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <style>
    .bg { fill: #0d9488; }   /* teal-600 for light mode backgrounds */
    .fg { fill: white; }
    @media (prefers-color-scheme: dark) {
      .bg { fill: #14b8a6; } /* teal-500, brighter on dark backgrounds */
    }
  </style>
  <rect width="32" height="32" rx="6" class="bg"/>
  <!-- weaving icon paths here, using class="fg" for white shapes -->
</svg>
```

### Apple Icon PNG Generation (one-time script)

```javascript
// scripts/generate-icons.mjs — run once, commit the outputs
import sharp from 'sharp';

// Generate apple-icon.png (180x180 PNG from SVG)
await sharp('packages/web/app/icon.svg')
  .resize(180, 180)
  .png()
  .toFile('packages/web/app/apple-icon.png');

// Generate favicon.ico frames
import { encode } from 'sharp-ico';
const img32 = await sharp('packages/web/app/icon.svg').resize(32, 32).png().toBuffer();
const img16 = await sharp('packages/web/app/icon.svg').resize(16, 16).png().toBuffer();
await encode([img16, img32], 'packages/web/app/favicon.ico');

console.log('Icons generated.');
```

### Logo.tsx Update Pattern

```tsx
// packages/web/components/Logo.tsx — after Phase 10
export const Logo = ({ className, withText, ...props }: LogoProps) => {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        className="w-full h-full shrink-0"
      >
        {/* New Transweave weaving icon paths here */}
        <rect width="32" height="32" rx="6" fill="url(#tw-icon-gradient)" />
        {/* weaving motif paths */}
        <defs>
          <linearGradient id="tw-icon-gradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop stopColor="#14b8a6" />   {/* brand teal */}
            <stop offset="1" stopColor="#6366f1" />  {/* brand indigo */}
          </linearGradient>
        </defs>
      </svg>
      {withText && (
        <span className="font-semibold text-lg tracking-tight">Transweave</span>
      )}
    </div>
  );
};
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 6+ favicon files (all sizes, manifest, etc.) | 3-file favicon strategy (ico + svg + apple-touch) | 2021, re-verified 2026 | Massive simplification — modern browsers only need 3 files |
| Separate `<link rel="shortcut icon">` tags in `<Head>` | Next.js `app/` directory file conventions | Next.js 13.3.0 (2023) | Zero-config; Next.js generates all `<link>` tags automatically |
| PNG-only favicons | SVG favicon with CSS media query for dark mode | ~2020 (browser support matured by 2022) | Single file handles light/dark mode; scales perfectly to any DPI |
| `@vercel/og` npm package | `next/og` (built-in, uses Satori + resvg) | Next.js 13.3.0 | No extra install; already available in this project |
| Puppeteer for image generation | `sharp` (native bindings, fast) | Established best practice, Node 18+ | 50x smaller, no Chrome download, no async headless browser |

**Deprecated/outdated:**
- `public/fanyi.webp`, `public/tutu.jpg`: Internal images to delete
- `public/next.svg`, `public/vercel.svg`: Next.js/Vercel boilerplate to delete
- `qlj-logo-gradient` gradient ID: Replace with `tw-icon-gradient` in all SVG files and `Logo.tsx`

---

## Brand Color Palette Recommendation

The existing project uses indigo/violet as `--primary` (`243 75% 59%`) and cyan as `--accent` (`199 89% 48%`). These are already a reasonable color system but lack brand specificity.

**Recommended Transweave brand palette:**

| Role | Color | Hex | Rationale |
|------|-------|-----|-----------|
| Primary brand | Teal | `#14b8a6` (teal-500) | Unique in dev tool space; suggests interconnection/flow; works on light and dark |
| Secondary brand | Indigo | `#6366f1` (indigo-500) | Complements teal; close to existing `--primary` so existing UI stays coherent |
| Gradient | Teal → Indigo | `#14b8a6` → `#6366f1` | Used in logo, hero backgrounds, OG image |
| Light tint | Teal-50 | `#f0fdfa` | Badge backgrounds, hover states |
| Dark tint | Teal-900 | `#134e4a` | Dark mode icon backgrounds |

**Why teal:** Tolgee is magenta/pink, Biome is orange/yellow, Drizzle is green. Teal is visually distinct from all three major competitors. It also resonates with "weaving" — the fabric/textile association with teal/turquoise is strong in design tradition. The "Trans" prefix additionally has positive associations with teal in contemporary design discourse.

**Confidence:** MEDIUM — color recommendations are subjective. This palette is grounded in competitor differentiation and color theory, but the final decision belongs to the implementer.

---

## GitHub Social Preview Specifics

**Dimensions:** 1280x640px at 2:1 ratio. GitHub recommends this exact size. Minimum is 640x320.

**Content:** Logo (icon + wordmark) + tagline + optional subtle background pattern or gradient.

**Upload process (manual, cannot be automated):**
1. Go to `https://github.com/[org]/[repo]/settings`
2. Scroll to "Social preview" section
3. Click "Edit"
4. Upload the 1280x640 PNG
5. Save

**Creation approach:** Design this as a static SVG or Figma/Canva canvas, export as PNG. The `next/og` ImageResponse API could generate it but that requires the landing page to be deployed first. For Phase 10, design it manually using any vector tool or even CSS-rendered HTML captured as PNG.

**Practical alternative:** Create the image in Canva or Figma using the brand colors, export as PNG, and commit to `assets/og-image-github.png` for reference. Upload manually to GitHub settings.

Source: [GitHub Docs: Customizing Social Media Preview](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview) — HIGH confidence (official docs)

---

## Open Questions

1. **Specific weaving motif geometry**
   - What we know: "weaving" motif is the correct visual concept; interlocked rings and stylized T letterform both read at 16px
   - What's unclear: Which specific geometric approach is most distinctive and communicates the brand best
   - Recommendation: Implement the icon as interlocked rings (2-3 overlapping circles) as a first iteration — it is the simplest to code correctly as SVG paths and reads cleanly at all sizes. Can be refined later.

2. **Whether to align `--primary` with the new brand teal**
   - What we know: `--primary: 243 75% 59%` is currently indigo-violet; changing it would affect all Radix UI component styling
   - What's unclear: Whether the product team wants the app UI to fully adopt the teal brand or keep the current indigo
   - Recommendation: Keep `--primary` as indigo for Phase 10; add `--brand-teal` as a new, additive token. Full brand alignment across UI components is a separate decision that requires testing all interactive states.

3. **ICO generation method: script vs. online tool**
   - What we know: Both `sharp-ico` and realfavicongenerator.net produce valid ICO files
   - What's unclear: Whether the team prefers a reproducible script or a simple one-time manual step
   - Recommendation: Use the online tool (realfavicongenerator.net) for Phase 10 — it is faster and requires no new dependencies. Add `sharp-ico` only if generating favicons needs to be automated in CI.

---

## Sources

### Primary (HIGH confidence)
- [Next.js favicon/icon/apple-icon file conventions](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons) — v16.1.6, updated 2026-02-27. Verified file names, placement, generated HTML.
- [Next.js Metadata and OG Images guide](https://nextjs.org/docs/app/getting-started/metadata-and-og-images) — Official guide, verified openGraph metadata structure.
- [Next.js install-sharp recommendation](https://nextjs.org/docs/messages/install-sharp) — Sharp for production image optimization.
- [GitHub Docs: Customizing social media preview](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview) — 1280x640 spec, manual upload process.
- Direct codebase analysis — `packages/web/tailwind.config.ts`, `packages/web/app/globals.css`, `packages/web/app/layout.tsx`, `packages/web/components/Logo.tsx`, `packages/web/public/favicon.svg` — all read and verified.

### Secondary (MEDIUM confidence)
- [Evil Martians: How to Favicon in 2026](https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs) — 3-file favicon strategy, dark mode SVG favicon via CSS media query
- [.planning/research/STACK.md](../../research/STACK.md) — Previous research covering Next.js 15 favicon conventions, sharp usage — HIGH confidence (compiled from official sources 2026-03-01)
- [.planning/research/FEATURES.md](../../research/FEATURES.md) — Competitor branding analysis, logo design patterns, color palette differentiation

### Tertiary (LOW confidence — visual design subjective)
- Teal brand palette recommendation — based on competitor differentiation analysis (Tolgee=magenta, Biome=orange, Drizzle=green) + color theory; subjective and should be validated by the implementer

---

## Metadata

**Confidence breakdown:**
- Next.js favicon file conventions: HIGH — verified against official docs v16.1.6
- Tailwind brand color extension: HIGH — verified directly in project's tailwind.config.ts
- CSS custom property patterns: HIGH — verified directly in project's globals.css
- GitHub social preview dimensions: HIGH — official GitHub docs
- SVG logo design approach: MEDIUM — based on competitor analysis and small-size readability heuristics
- Brand color palette (teal/indigo): MEDIUM — competitor differentiation logic is sound, aesthetic judgment is subjective

**Research date:** 2026-03-02
**Valid until:** 2026-06-01 (Next.js file conventions stable; Tailwind 3.x config pattern stable)
