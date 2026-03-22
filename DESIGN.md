# Design System — Transweave

## Product Context
- **What this is:** Self-hosted i18n management platform for development teams
- **Who it's for:** Developers and translation managers who need to manage multilingual projects at scale
- **Space/industry:** Developer tools, localization/i18n (peers: Crowdin, Lokalise, Tolgee, Phrase)
- **Project type:** Data-heavy web app (translation tables, key management, AI-assisted workflows)

## Aesthetic Direction
- **Direction:** Precision Dark — function-first, high contrast, near-monochrome with brand blue accent
- **Decoration level:** Minimal — no gradients on surfaces, no decorative illustrations. Layer hierarchy through background luminance and border rings only.
- **Mood:** Precise, developer-native, quietly confident. Like a precision instrument — every pixel has purpose.
- **Reference sites:** linear.app, vercel.com

## Typography
- **Display/Hero:** Geist (800/900) — tight letter-spacing (-0.03em to -0.045em) for impact at large sizes
- **Body:** Geist (400/500/600) — designed by Vercel for developer tools. Excellent readability at small sizes.
- **UI/Labels:** Geist (500) — medium weight for labels and emphasis
- **Data/Tables:** Geist with `font-feature-settings: "tnum"` — tabular numbers for aligned columns
- **Code/Keys:** Geist Mono (400) — token keys, code snippets, CLI commands, monospace section labels
- **Loading:** Geist/Geist Mono via `cdn.jsdelivr.net/npm/geist@1.3.1`
- **Scale:**
  - `xs`: 11px — monospace labels, tertiary text
  - `sm`: 12px — badges, table headers, metadata, small buttons
  - `base`: 13px — table cells, compact UI text
  - `md`: 14px — body text, inputs, standard UI
  - `lg`: 16px — descriptions, hero subtext
  - `xl`: 18px — sub-headings, card titles
  - `2xl`: 24px — section headings
  - `3xl`: 32px — page titles
  - `4xl`: 48px — hero headings
  - `5xl`: 56-64px — landing page hero
- **Letter spacing:** Headings (2xl+): -0.03em. Hero (4xl+): -0.045em. Geist Mono labels: 0.06-0.08em uppercase. Body: default.

## Color
- **Approach:** Restrained — near-monochrome base with brand blue as the sole accent color. Color signals state, not decoration.
- **Philosophy:** Brand gradient (cyan→blue→indigo) derived from app icon. Blue #3b82f6 extracted as functional primary. Gradient reserved for brand moments only.

### Brand
- **Brand gradient:** `linear-gradient(135deg, #06b6d4, #3b82f6, #6366f1)` — logo, hero gradient text, brand-level CTAs only
- **Functional primary:** Blue #3b82f6 — AI/translation buttons, focus states, active indicators, links

### Dark Mode (default)
| Token | Value | Usage |
|-------|-------|-------|
| `--bg-0` | `#09090b` | Page background |
| `--bg-1` | `#0f0f11` | Card/surface background |
| `--bg-2` | `#18181b` | Elevated surfaces, table headers, code blocks |
| `--bg-3` | `#1f1f23` | Active/pressed states, badge backgrounds |
| `--bg-hover` | `#27272a` | Hover state backgrounds |
| `--fg-0` | `#fafafa` | Primary text, headings |
| `--fg-1` | `#e4e4e7` | Body text |
| `--fg-2` | `#a1a1aa` | Secondary text |
| `--fg-3` | `#71717a` | Tertiary text, placeholders |
| `--fg-4` | `#52525b` | Disabled text, decorative |
| `--border-1` | `rgba(255,255,255,0.06)` | Default borders, dividers |
| `--border-2` | `rgba(255,255,255,0.10)` | Input borders, card borders |
| `--border-3` | `rgba(255,255,255,0.16)` | Hover state borders, focus rings |
| `--primary` | `#3b82f6` | Brand actions, AI buttons |
| `--primary-dark` | `#60a5fa` | Primary text on dark (brighter for readability) |
| `--primary-hover` | `#2563eb` | Primary button hover |
| `--primary-muted` | `rgba(59,130,246,0.08)` | Primary tint backgrounds, active sidebar |

### Light Mode
| Token | Value | Usage |
|-------|-------|-------|
| `--bg-0` | `#ffffff` | Page background |
| `--bg-1` | `#fafafa` | Card/surface background |
| `--bg-2` | `#f4f4f5` | Elevated surfaces, code blocks |
| `--bg-3` | `#e4e4e7` | Active/pressed states |
| `--bg-hover` | `#f4f4f5` | Hover state backgrounds |
| `--fg-0` | `#09090b` | Primary text |
| `--fg-1` | `#18181b` | Body text |
| `--fg-2` | `#52525b` | Secondary text |
| `--fg-3` | `#a1a1aa` | Tertiary text, placeholders |
| `--fg-4` | `#d4d4d8` | Disabled, decorative |
| `--border-1` | `rgba(0,0,0,0.06)` | Default borders |
| `--border-2` | `rgba(0,0,0,0.10)` | Input/card borders |
| `--border-3` | `rgba(0,0,0,0.16)` | Hover borders |
| `--primary` | `#3b82f6` | Brand actions |
| `--primary-hover` | `#2563eb` | Primary hover |
| `--primary-muted` | `rgba(59,130,246,0.06)` | Primary tint backgrounds |

### Blue Scale
| Step | Value | Usage |
|------|-------|-------|
| 50 | `#eff6ff` | Light mode tint backgrounds |
| 100 | `#dbeafe` | Light mode hover tints |
| 200 | `#bfdbfe` | — |
| 300 | `#93c5fd` | — |
| 400 | `#60a5fa` | Dark mode primary text |
| 500 | `#3b82f6` | Functional primary |
| 600 | `#2563eb` | Hover/pressed states |
| 700 | `#1d4ed8` | — |
| 800 | `#1e40af` | — |

### Semantic
- **Success:** `#16a34a` (light) / `#22c55e` (dark)
- **Warning:** `#ca8a04` (light) / `#eab308` (dark)
- **Error:** `#dc2626` (light) / `#ef4444` (dark)
- **Info:** `#0284c7` (light) / `#38bdf8` (dark)
- **Muted variants:** 8-10% opacity of each semantic color for badge/alert backgrounds

### Primary Button
- Dark mode: `background: #fafafa; color: #09090b` (Vercel-style inverted)
- Light mode: `background: #09090b; color: #fafafa`
- Blue button (`--primary`) reserved for AI/translation actions only
- Brand gradient button only for hero-level CTAs (e.g. "Try Demo" on landing page)

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable — data tables need breathing room
- **Scale:** `--space-1`(4) `--space-2`(8) `--space-3`(12) `--space-4`(16) `--space-5`(20) `--space-6`(24) `--space-8`(32) `--space-10`(40) `--space-12`(48) `--space-16`(64)
- **Table row height:** 44px

## Layout
- **Approach:** Grid-disciplined — strict columns, predictable alignment
- **Max content width:** 1080px
- **Sidebar width:** 220px, collapsible to 52px icon rail
- **Border radius:** sm(3px) md(6px) lg(8px) full(9999px) — sharp, tool-like
- **Card treatment:** `border: 1px solid var(--border-1)` — single-pixel ring, no drop shadow. Hover: `border-color: var(--border-2)`

### Surface Hierarchy
Depth is communicated through background luminance steps, not shadows. Each level is ~2-4% brighter than the one below.

| Layer | Dark Mode | Light Mode | Usage |
|-------|-----------|------------|-------|
| bg-0 (page) | `#09090b` | `#ffffff` | Page background, deepest layer |
| Sidebar | `#0c0c0e` | `#fafafa` | Navigation sidebar — visually distinct from both page and content |
| bg-1 (surface) | `#111113` | `#fafafa` | Cards, panels, content containers |
| bg-2 (elevated) | `#18181b` | `#f4f4f5` | Table headers, code blocks, nested surfaces |
| bg-3 (active) | `#1f1f23` | `#e4e4e7` | Active/pressed states, selected rows |

The sidebar MUST be visually distinct from the main content area. It sits between bg-0 and bg-1 — slightly lighter than the page but not as bright as content cards.

### Page Layout Patterns
All app pages (behind auth) share this structure:
- **Sidebar** (220px) on the left with team/project tree
- **Main content** fills remaining width, scrolls independently
- Content uses `max-w-5xl` (1024px) with `px-6 lg:px-10` padding
- Page title: `text-2xl font-semibold tracking-tight` — always the first element, left-aligned
- Subtitle/count: `text-sm text-muted-foreground mt-1`

### Page Title Convention
Every page has ONE clear page title that serves as the visual anchor:
- Teams page: team name (2xl) — since sidebar already shows the nav tree
- Project page: project name (2xl) with breadcrumb
- Settings page: "Settings" (2xl)
- Never smaller than text-xl for page titles

## Motion
- **Approach:** Minimal-functional — only transitions that aid comprehension
- **Easing:** enter(ease-out) exit(ease-in) move(ease-in-out)
- **Duration:** micro(100ms) short(150ms) medium(200ms)
- **What animates:** hover state transitions, focus rings, drawer open/close, toast appear/dismiss
- **What doesn't:** page transitions, scroll effects, decorative animations

## Anti-patterns (never use)
- Purple/violet gradients as default accent throughout the UI
- Large border-radius (>12px) on cards or containers
- Drop shadows on cards (use border rings instead)
- Gradient buttons for anything other than hero-level brand CTAs
- Decorative background patterns or illustrations on surfaces
- Inter, Roboto, Poppins, or other overused fonts
- AI slop: centered-everything layouts, uniform bubbly corners, stock-photo hero sections
- Random colorful icons on stat cards — use monochrome icons

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-21 | Initial design system created | Vercel-inspired minimal direction with Precision Dark aesthetic. |
| 2026-03-21 | Brand Blue #3b82f6 as primary | Derived from app icon gradient (cyan→blue→indigo). Blue as functional primary, gradient reserved for brand moments. Differentiates from Crowdin(green), Tolgee(pink), Phrase(purple). |
| 2026-03-21 | Geist unified typography | Geist for all text (headings via weight 800/900, body via 400/500). Geist Mono for code/keys. One font family = consistency + simplicity. |
| 2026-03-21 | Zinc neutrals (not blue-gray) | Pure gray scale (#09090b→#fafafa) instead of blue-tinted grays. Feels more premium and tool-like. |
| 2026-03-21 | Border rings, no shadows | Cards use 1px border ring instead of drop-shadow. Cleaner, more engineering-grade aesthetic. |
| 2026-03-21 | White primary button | Vercel-style inverted button for primary actions. Blue button reserved for AI/translation-specific operations. |
| 2026-03-22 | Surface hierarchy via luminance | bg-0→sidebar→bg-1→bg-2 layering through background brightness, not shadows. Sidebar gets its own distinct luminance step between page and card. |
| 2026-03-22 | Page layout patterns | All app pages use max-w-5xl (1024px), text-2xl page titles, and consistent padding. Sidebar provides navigation; main content provides detail. |
