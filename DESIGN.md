# Design System — Transweave

## Product Context
- **What this is:** Self-hosted i18n management platform for development teams
- **Who it's for:** Developers and translation managers who need to manage multilingual projects at scale
- **Space/industry:** Developer tools, localization/i18n (peers: Crowdin, Lokalise, Tolgee, Phrase)
- **Project type:** Data-heavy web app (translation tables, key management, AI-assisted workflows)

## Aesthetic Direction
- **Direction:** Vercel-inspired minimal — function-first, high contrast, near-monochrome
- **Decoration level:** Minimal — typography and spacing do all the work. No gradients on surfaces, no decorative illustrations. Color is earned, not given.
- **Mood:** Precise, developer-native, quietly confident. The product should feel like a serious tool built by people who care about craft.
- **Reference sites:** vercel.com, linear.app

## Typography
- **Display/Hero:** Satoshi (700/900) — geometric sans with warmth, used for page titles and section headings. Adds personality without sacrificing readability. Loaded from FontShare.
- **Body:** Geist (400/500/600) — designed by Vercel for developer tools. Excellent readability at small sizes, built-in tabular-nums. The workhorse for all UI text.
- **UI/Labels:** Geist (500) — same as body, medium weight for labels and emphasis
- **Data/Tables:** Geist with `font-feature-settings: "tnum"` — tabular numbers for aligned columns
- **Code/Keys:** Geist Mono (400) — token keys, code snippets, monospace accents in section labels
- **Loading:** Satoshi via `api.fontshare.com`, Geist/Geist Mono via `cdn.jsdelivr.net/npm/geist@1.3.1`
- **Scale:**
  - `xs`: 11px — monospace labels, tertiary text
  - `sm`: 12px — badges, table headers, metadata
  - `base`: 13-14px — body text, table cells, inputs
  - `lg`: 16px — descriptions, hero subtext
  - `xl`: 18px — sub-headings
  - `2xl`: 24px — section headings
  - `3xl`: 30-36px — page titles (Satoshi)
  - `4xl`: 48-56px — hero headings (Satoshi)
- **Letter spacing:** Satoshi headings: -0.03em to -0.045em. Geist body: default. Geist Mono labels: 0.06-0.1em uppercase.

## Color
- **Approach:** Restrained — near-monochrome base, teal primary used sparingly and meaningfully. Color signals state, not decoration.
- **Philosophy:** In a space where competitors use purple, blue, and pink, teal (#14b8a6) is distinctive. It says "stable infrastructure" rather than "shiny startup."

### Light Mode
| Token | Value | Usage |
|-------|-------|-------|
| `--bg-000` | `#ffffff` | Page background |
| `--bg-100` | `#fafafa` | Card/surface background |
| `--bg-200` | `#f5f5f5` | Elevated surfaces, code blocks |
| `--fg-000` | `#000000` | Primary text |
| `--fg-100` | `#171717` | Body text |
| `--fg-200` | `#525252` | Secondary text |
| `--fg-300` | `#a3a3a3` | Tertiary text, placeholders |
| `--fg-400` | `#d4d4d4` | Disabled, decorative |
| `--border` | `rgba(0,0,0,0.08)` | Default borders |
| `--border-hover` | `rgba(0,0,0,0.15)` | Hover state borders |
| `--primary` | `#0d9488` (teal-600) | Primary actions, links |
| `--primary-bg` | `rgba(20,184,166,0.06)` | Teal tint backgrounds |

### Dark Mode
| Token | Value | Usage |
|-------|-------|-------|
| `--bg-000` | `#000000` | Page background (true black) |
| `--bg-100` | `#0a0a0a` | Card/surface background |
| `--bg-200` | `#171717` | Elevated surfaces |
| `--fg-000` | `#ededed` | Primary text |
| `--fg-200` | `#a1a1a1` | Secondary text |
| `--fg-300` | `#6b6b6b` | Tertiary text |
| `--border` | `rgba(255,255,255,0.08)` | Default borders |
| `--primary` | `#2dd4bf` (teal-400) | Primary actions (brighter for dark bg) |

### Brand Palette
- **Teal 50:** `#f0fdfa` — light tint backgrounds
- **Teal 400:** `#2dd4bf` — dark mode primary
- **Teal 500:** `#14b8a6` — brand primary
- **Teal 600:** `#0d9488` — light mode primary, hover states
- **Teal 700:** `#0f766e` — pressed states

### Secondary (Indigo — used sparingly)
- **Indigo 400:** `#818cf8` — dark mode accent
- **Indigo 500:** `#6366f1` — light mode accent
- Used only for: AI features, secondary CTAs, chart accents

### Semantic
- **Success:** `#16a34a` (light) / `#22c55e` (dark)
- **Warning:** `#ca8a04` (light) / `#eab308` (dark)
- **Error:** `#dc2626` (light) / `#ef4444` (dark)
- **Info:** `#0284c7` (light) / `#38bdf8` (dark)

### Primary Button
- Light mode: `background: #000; color: #fff` (Vercel-style inverted)
- Dark mode: `background: #ededed; color: #000`
- Teal button reserved for AI/translation actions only

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable — data tables need breathing room, not cramped
- **Scale:** 2xs(2) xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64)

## Layout
- **Approach:** Grid-disciplined — strict columns, predictable alignment. Data tables and forms need structure.
- **Max content width:** 1080px
- **Border radius:** sm(4px) md(6px) lg(8px) full(9999px) — smaller than typical SaaS, sharper feel
- **Card treatment:** `box-shadow: 0 0 0 1px var(--border)` (single-pixel ring, no drop shadow). Hover: `0 0 0 1px var(--border-hover)`

## Motion
- **Approach:** Minimal-functional — only transitions that aid comprehension
- **Easing:** enter(ease-out) exit(ease-in) move(ease-in-out)
- **Duration:** micro(100ms) short(150ms) medium(200ms)
- **What animates:** drawer open/close, toast appear/dismiss, hover state transitions, focus rings
- **What doesn't:** page transitions, scroll effects, decorative animations

## Anti-patterns (never use)
- Purple/violet gradients as default accent
- Large border-radius (>12px) on cards or containers
- Drop shadows on cards (use border rings instead)
- Gradient buttons for primary CTA
- Decorative background patterns or illustrations
- Inter, Roboto, Poppins, or other overused fonts
- AI slop: centered-everything layouts, uniform bubbly corners, stock-photo hero sections

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-21 | Initial design system created | Vercel-inspired minimal direction. Teal primary to differentiate in purple/blue dominated i18n space. Satoshi display + Geist body for developer-tool DNA. |
| 2026-03-21 | True black dark mode (#000) | Matches Vercel aesthetic. Higher contrast, more premium feel than dark gray. |
| 2026-03-21 | Small border radius (6px default) | Sharper, more tool-like. Avoids generic SaaS bubble aesthetic. |
| 2026-03-21 | White primary button (dark text) | Vercel signature pattern. Teal reserved for AI/translation-specific actions. |
