# Web Architecture

Next.js 15 App Router frontend. React 19 · TailwindCSS · Radix UI (via shadcn/ui) · Jotai for global state · `next-intl` for i18n.

## Layout

```
app/            Pages (App Router)
  login/  signup-or-redirect through setup
  setup/        First-run admin onboarding (gate)
  project/      Project workspace
  team/         Team management
  settings/     User + workspace settings
  profile/      Profile page
  tutorial/     Onboarding flow
  user/         User-scoped pages
  layout.tsx, page.tsx, globals.css

api/            Client-side API wrappers (axios) — one file per resource
components/
  ui/           shadcn/ui primitives (Radix-based)
  views/        Page-level view components (project, team, settings, sidebar, …)
  data-table/   Reusable table
  i18n/         i18n widgets
hooks/          Reusable hooks (data tables, projects, teams, toast, …)
jotai/          Global state atoms (index.ts, types.ts)
i18n/           Translation bundles + config (zh-CN.json default, en-US.json)
lib/            Pure helpers
config/         Runtime config
constants/
types/
e2e/            Playwright tests
middleware.ts   Proxies /api/* to backend (avoids CORS in browser)
```

## Routing & first-run

- `middleware.ts` proxies `/api/*` to the backend, so frontend and backend can run on different ports with no CORS in the browser
- First visit redirects to `/setup` for admin account creation
- Authentication state lives in Jotai atoms; route guards happen inside view components

## i18n

- Default locale `zh-CN`; second locale `en-US` — both must be updated together
- Managed via `pnpm --filter @transweave/web i18n` (key add/remove/sync)
- Library: `next-intl`
- `i18n/all.json` is the unified key catalog

## API layer (`api/`)

Each file wraps one backend resource: `auth`, `user`, `team`, `project`, `api-key`, `ai`, `agent`, `glossary`, `translation-memory`, `lint`, `qa-check`, `upload`.

All requests go through the `middleware.ts` proxy → backend on `:3001`.

## Component conventions

- Use `components/ui/*` (shadcn) primitives — do not introduce a second UI library
- Page-level composition belongs in `components/views/*`
- Match `DESIGN.md` for any visual decision

## Tests

- E2E: Playwright (`packages/web/e2e/`, config in `playwright.config.ts`)
- Lint: `pnpm --filter @transweave/web lint`
