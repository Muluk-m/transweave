# Architecture: Project Rename & Branding Integration

**Domain:** Renaming qlj-i18n to Transweave within an existing pnpm monorepo (Next.js 15 + NestJS 11 + CLI)
**Researched:** 2026-03-01
**Confidence:** HIGH (based on direct codebase analysis -- every reference audited)

## Current Architecture (Before Rename)

```
qlj-fe-i18n/                              <-- repo root (directory name)
  package.json                             name: "@qlj/i18n-manager"
  pnpm-workspace.yaml                     packages/*
  docker-compose.yml                      services: postgres, server, web
  .env.example                            header: "qlj-i18n Environment Configuration"
  README.md                               references qlj-i18n throughout
  AGENTS.md                               no brand refs
  packages/
    web/                                   name: "nextjs" in package.json
      package.json                         name: "nextjs"
      Dockerfile                           --filter nextjs
      next.config.mjs                      standalone output
      app/layout.tsx                       title: "i18n Manager"
      public/favicon.svg                   id: "qlj-logo-gradient"
      public/logo.svg                      same gradient id
      i18n/all.json                        header.title.en-US: "qlj-i18n"
      lib/cookies.ts                       LANGUAGE_COOKIE_KEY: "i18n_language"
      lib/auth/auth-context.tsx            localStorage key: "authToken"
    server/                                name: "qlj-i18n-server" in package.json
      package.json                         name: "qlj-i18n-server"
      Dockerfile                           --filter qlj-i18n-server
      src/service/api-key.service.ts       prefix: "qlji_"
      src/jwt/guard.ts                     startsWith("qlji_")
      src/service/mcp.service.ts           name: "qlj-i18n-mcp-server"
      src/ai/encryption.util.ts            salt: "qlj-i18n-ai-salt"
      src/controller/mcp.controller.ts     HTML, JSON refs to qlji_, qlj-i18n
    cli/                                   name: "qlj-i18n" in package.json
      package.json                         bin: { "qlj-i18n": "./bin/qlj-i18n.js" }
      bin/qlj-i18n.js                      entry point file
      src/index.ts                         .name("qlj-i18n")
      src/config.ts                        CONFIG_DIR: ~/.config/qlj-i18n
                                           PROJECT_CONFIG_FILENAME: .qlj-i18n.json
                                           env vars: QLJ_I18N_API_KEY, QLJ_I18N_SERVER
      src/commands/login.ts                validates qlji_ prefix
      src/commands/init.ts                 references qlj-i18n in messages
      src/commands/pull.ts                 references qlj-i18n in messages
      src/commands/push.ts                 references qlj-i18n in messages
  docs/
    api-reference.md                       qlji_ examples, qlj-i18n CLI docs
```

## Complete Rename Inventory

Every reference that must change, categorized by impact level.

### Category 1: Breaking Changes (API contract changes -- affect existing users)

These changes break backward compatibility. Existing API keys stop working, existing CLI configs stop working.

| Reference | File | Current | New | Breaking Impact |
|-----------|------|---------|-----|-----------------|
| API key prefix | `packages/server/src/service/api-key.service.ts:22` | `qlji_` | `tw_` | All existing API keys invalid |
| API key prefix length | `packages/server/src/service/api-key.service.ts:6` | `13` (qlji_ + 8 hex) | `11` (tw_ + 8 hex) | Key parsing breaks |
| Auth guard check | `packages/server/src/jwt/guard.ts:36` | `qlji_` | `tw_` | Existing API keys rejected |
| MCP auth check | `packages/server/src/controller/mcp.controller.ts:28` | `Bearer qlji_` | `Bearer tw_` | MCP clients break |
| CLI login validation | `packages/cli/src/commands/login.ts:12-13` | `qlji_` | `tw_` | CLI rejects old keys |
| CLI config directory | `packages/cli/src/config.ts:17` | `~/.config/qlj-i18n` | `~/.config/transweave` | Old config not found |
| CLI project config file | `packages/cli/src/config.ts:19` | `.qlj-i18n.json` | `.transweave.json` | Old project configs ignored |
| CLI env var names | `packages/cli/src/config.ts:73,86` | `QLJ_I18N_API_KEY`, `QLJ_I18N_SERVER` | `TRANSWEAVE_API_KEY`, `TRANSWEAVE_SERVER` | CI/CD env vars break |
| Encryption salt | `packages/server/src/ai/encryption.util.ts:17` | `qlj-i18n-ai-salt` | `transweave-ai-salt` | Encrypted AI keys unreadable |

### Category 2: Package Identity (build system, Docker, npm)

| Reference | File | Current | New |
|-----------|------|---------|-----|
| Root package name | `package.json:2` | `@qlj/i18n-manager` | `@transweave/monorepo` |
| Server package name | `packages/server/package.json:2` | `qlj-i18n-server` | `@transweave/server` |
| Web package name | `packages/web/package.json:2` | `nextjs` | `@transweave/web` |
| CLI package name | `packages/cli/package.json:2` | `qlj-i18n` | `transweave` |
| CLI binary name | `packages/cli/package.json:6` | `qlj-i18n` | `transweave` |
| CLI bin file | `packages/cli/bin/qlj-i18n.js` | filename | `packages/cli/bin/transweave.js` |
| Server Dockerfile filter | `packages/server/Dockerfile:15` | `qlj-i18n-server` | `@transweave/server` |
| Web Dockerfile filter | `packages/web/Dockerfile:17` | `nextjs` | `@transweave/web` |
| Web Dockerfile CMD | `packages/web/Dockerfile:34` | `nextjs` | `@transweave/web` |

### Category 3: UI/Branding (user-visible text, no API impact)

| Reference | File | Current | New |
|-----------|------|---------|-----|
| Page title | `packages/web/app/layout.tsx:14` | `i18n Manager` | `Transweave` |
| Header title (en) | `packages/web/i18n/all.json:48` | `qlj-i18n` | `Transweave` |
| Header title (zh) | `packages/web/i18n/all.json:47` | `i18n Platform` | `Transweave` |
| Welcome title (en) | `packages/web/i18n/all.json:26` | `i18n Platform` | `Transweave` |
| MCP server name | `packages/server/src/service/mcp.service.ts:24` | `qlj-i18n-mcp-server` | `transweave-mcp-server` |
| MCP HTML page | `packages/server/src/controller/mcp.controller.ts` (multiple) | `qlj-i18n` | `transweave` |
| Favicon SVG gradient ID | `packages/web/public/favicon.svg:8` | `qlj-logo-gradient` | `tw-logo-gradient` |
| Logo SVG gradient ID | `packages/web/public/logo.svg` | `qlj-logo-gradient` | `tw-logo-gradient` |
| Cookie name | `packages/web/lib/cookies.ts:1` | `i18n_language` | `tw_language` |

### Category 4: Documentation (text only, no code impact)

| Reference | File | Current | New |
|-----------|------|---------|-----|
| README title/body | `README.md` | `qlj-i18n` throughout | `transweave` |
| .env.example header | `.env.example:2` | `qlj-i18n` | `Transweave` |
| API reference doc | `docs/api-reference.md` | `qlji_` examples, `qlj-i18n` CLI | `tw_` examples, `transweave` CLI |
| CLI descriptions | `packages/cli/src/index.ts:8-9` | `qlj-i18n` | `transweave` |
| CLI command messages | `packages/cli/src/commands/*.ts` | `qlj-i18n` in all messages | `transweave` |

## Architecture Decision: Landing Page Placement

### Decision: Subdirectory of packages/web (`/app/(landing)/`)

**NOT a separate package. NOT a separate repo.**

Rationale:

1. **Same tech stack** -- The landing page uses the same Next.js 15, Tailwind, Radix stack already in `packages/web`. Zero additional dependencies.

2. **Shared assets** -- Logo, favicon, OG images, color tokens are used by both the app and the landing page. Keeping them in one package avoids duplication.

3. **Route group pattern** -- Next.js app router supports route groups via `(folder)` naming. The landing page lives at `/app/(landing)/page.tsx` with its own layout (no header/auth), while the existing app routes keep their layout. This is idiomatic Next.js.

4. **Single Docker image** -- No additional service in docker-compose. The landing page is just another route in the same Next.js app. Self-hosters get the landing page at `/` automatically.

5. **No workspace complexity** -- Adding a `packages/landing` would require its own build pipeline, Dockerfile, docker-compose service entry, and nginx routing. All unnecessary overhead.

```
packages/web/app/
  (landing)/                   <-- NEW: route group, no layout prefix
    page.tsx                   Landing page (marketing, hero, features)
    layout.tsx                 Minimal layout (no app header/auth)
  (app)/                       <-- MOVED: existing app routes wrapped in group
    layout.tsx                 App layout (header, auth provider)
    login/page.tsx
    signup/page.tsx
    setup/page.tsx
    project/...
    team/...
    settings/...
    ...
  layout.tsx                   Root layout (html, body, fonts, metadata)
  globals.css
```

**Key architectural detail:** The root `layout.tsx` stays minimal (html/body/fonts). The `(app)/layout.tsx` gets the AuthProvider, HeaderView, and app chrome. The `(landing)/layout.tsx` has marketing-style layout with no auth requirement.

### Alternatives Rejected

| Alternative | Why Rejected |
|-------------|-------------|
| Separate `packages/landing` | Unnecessary build complexity, asset duplication, extra Docker service |
| Separate repository | Breaks monorepo benefits, separate deploy pipeline, asset sync nightmare |
| Static site (Astro/Hugo) | Different tech stack to maintain, can't share React components or design tokens |
| Subdomain (`www.transweave.dev`) | Requires DNS setup, separate deployment -- overkill for a self-hosted project |

## Architecture Decision: Docker Image Naming

### Current State (no explicit image names)

The `docker-compose.yml` uses `build:` directives without `image:` tags. Docker Compose auto-names them based on project directory (e.g., `qlj-fe-i18n-server`).

### Recommended: Add Explicit Image Names

```yaml
services:
  server:
    image: transweave/server:latest
    build:
      context: .
      dockerfile: packages/server/Dockerfile

  web:
    image: transweave/web:latest
    build:
      context: .
      dockerfile: packages/web/Dockerfile
```

This enables:
- Pre-built images on Docker Hub / GHCR for users who don't want to build
- Consistent naming regardless of which directory the repo is cloned into
- Version tagging (`transweave/server:1.1.0`)

**Registry namespace:** Use `ghcr.io/[github-org]/transweave-server` and `ghcr.io/[github-org]/transweave-web` for GitHub Container Registry. Or `transweave/server` on Docker Hub if the organization claims the namespace.

## Architecture Decision: API Key Prefix Migration

### Decision: Hard cut to `tw_` with no backward compatibility

Rationale:

1. **This is a v1.1 branding release** -- it is the right moment for a clean break. There are no external users yet (the project hasn't been publicly released under the old name).

2. **Dual-prefix support adds permanent complexity** -- The auth guard would need to check both `qlji_` and `tw_` forever, the API key service would need to generate the new prefix while validating both, and documentation would be confusing.

3. **Existing keys are hashed** -- API keys are stored as bcrypt hashes with only the prefix visible. You cannot migrate them to a new prefix without the original key material. A migration would require invalidating all old keys regardless.

4. **Prefix length change matters** -- `qlji_` is 5 chars + 8 hex = 13 char prefix. `tw_` is 3 chars + 8 hex = 11 char prefix. The `KEY_PREFIX_LENGTH` constant and prefix-based lookup logic must change.

### New Constants

```typescript
// api-key.service.ts
const KEY_PREFIX = 'tw_';
const KEY_PREFIX_LENGTH = 11; // "tw_" (3) + 8 hex chars

// jwt/guard.ts
if (token.startsWith('tw_')) { ... }

// mcp.controller.ts
if (!authHeader?.startsWith('Bearer tw_')) { ... }
```

## Architecture Decision: Encryption Salt Change

### Decision: Change salt, accept that stored AI provider keys become unreadable

The `encryption.util.ts` uses `scryptSync(secret, 'qlj-i18n-ai-salt', 32)` to derive an encryption key for storing AI provider API keys. Changing the salt to `'transweave-ai-salt'` means any previously encrypted AI keys in the database cannot be decrypted.

**This is acceptable because:**
1. The project hasn't been publicly released yet -- no real users with stored keys
2. The error handling already covers this case: "The encryption key may have changed. Please re-enter your API key in settings."
3. AI provider keys are easily re-entered by users

**If this project had existing users**, you would need a migration script that reads all AI keys with the old salt, decrypts them, and re-encrypts with the new salt. That is NOT needed here.

## Architecture Decision: Cookie Naming

### Decision: Change `i18n_language` to `tw_language`

The current cookie name `i18n_language` is generic and could collide with other i18n tools running on the same domain. Changing to `tw_language` (or `transweave_language`) brands the cookie and avoids collisions.

**Impact:** Users' language preference resets once. The `getUserLanguage()` function falls back to browser language detection, so the impact is invisible.

The localStorage key `authToken` is already generic (not branded). It should be changed to `tw_auth_token` to avoid collisions if multiple apps run on the same origin. But this is lower priority since the app is typically self-hosted on its own domain.

## Component Boundary Changes

### Before and After

```
BEFORE:                              AFTER:
@qlj/i18n-manager (root)            @transweave/monorepo (root)
  +-- nextjs (web)                    +-- @transweave/web
  +-- qlj-i18n-server (server)        +-- @transweave/server
  +-- qlj-i18n (cli)                  +-- transweave (cli, npm publishable)
```

### New Component: Landing Page (within web)

```
@transweave/web
  app/
    (landing)/          <-- NEW component boundary
      page.tsx          Hero, features showcase, CTA
      layout.tsx        Marketing layout (no auth, custom nav)
      components/       Landing-specific components (hero, feature cards, footer)
    (app)/              <-- Existing app, regrouped
      layout.tsx        App layout (auth, header, sidebar)
      ...existing routes...
  public/
    logo.svg            <-- REPLACED with new Transweave logo
    favicon.svg         <-- REPLACED with new Transweave favicon
    og-image.png        <-- NEW: Open Graph image for social sharing
    logo-dark.svg       <-- NEW: dark mode variant
```

### No New Packages

The monorepo stays at 3 packages: web, server, cli. The landing page is NOT a new package -- it is a route group within web.

## Data Flow Changes

### API Key Flow (changed)

```
BEFORE:
  Client --> Bearer qlji_xxx --> AuthGuard (check qlji_ prefix) --> ApiKeyService (prefix lookup)

AFTER:
  Client --> Bearer tw_xxx --> AuthGuard (check tw_ prefix) --> ApiKeyService (prefix lookup)
```

### CLI Config Flow (changed)

```
BEFORE:
  CLI reads ~/.config/qlj-i18n/config.json
  CLI reads ./.qlj-i18n.json
  CLI checks $QLJ_I18N_API_KEY, $QLJ_I18N_SERVER

AFTER:
  CLI reads ~/.config/transweave/config.json
  CLI reads ./.transweave.json
  CLI checks $TRANSWEAVE_API_KEY, $TRANSWEAVE_SERVER
```

### Landing Page Flow (new)

```
  Browser --> GET / --> Next.js (landing)/page.tsx --> Static render (no API calls)
  Browser --> clicks "Get Started" --> /login or /setup (enters (app) route group)
```

## Build Order: What to Change First vs Last

The rename must follow a specific order to avoid broken builds at any intermediate step. Here is the dependency-aware sequence.

### Phase 1: Package Identity (must be first -- everything else depends on package names)

```
Step 1.1: package.json name changes (all 3 packages + root)
  - package.json:         "@qlj/i18n-manager" --> "@transweave/monorepo"
  - packages/server/:     "qlj-i18n-server" --> "@transweave/server"
  - packages/web/:        "nextjs" --> "@transweave/web"
  - packages/cli/:        "qlj-i18n" --> "transweave"

Step 1.2: Dockerfile filter references (depend on package names)
  - packages/server/Dockerfile:  --filter qlj-i18n-server --> --filter @transweave/server
  - packages/web/Dockerfile:     --filter nextjs --> --filter @transweave/web

Step 1.3: pnpm-lock.yaml regeneration
  - Run: pnpm install (updates lock file with new package names)

Step 1.4: CLI binary rename
  - packages/cli/package.json bin: "qlj-i18n" --> "transweave"
  - Rename file: packages/cli/bin/qlj-i18n.js --> packages/cli/bin/transweave.js
  - Update bin entry to point to new filename
```

**Verify:** `pnpm build:server && pnpm build:web && pnpm build:cli` all pass.

### Phase 2: Server-Side Code Changes (API contract changes)

```
Step 2.1: API key prefix
  - packages/server/src/service/api-key.service.ts
    - KEY_PREFIX_LENGTH: 13 --> 11
    - fullKey template: `qlji_${randomPart}` --> `tw_${randomPart}`

Step 2.2: Auth guard
  - packages/server/src/jwt/guard.ts
    - token.startsWith('qlji_') --> token.startsWith('tw_')

Step 2.3: MCP controller
  - packages/server/src/controller/mcp.controller.ts
    - All qlji_ references --> tw_
    - All qlj-i18n references --> transweave

Step 2.4: MCP service
  - packages/server/src/service/mcp.service.ts
    - name: 'qlj-i18n-mcp-server' --> 'transweave-mcp-server'

Step 2.5: Encryption salt
  - packages/server/src/ai/encryption.util.ts
    - salt: 'qlj-i18n-ai-salt' --> 'transweave-ai-salt'
```

**Verify:** `pnpm build:server && pnpm --filter @transweave/server test` passes.

### Phase 3: CLI Code Changes (depends on server API contract)

```
Step 3.1: Config paths and env vars
  - packages/cli/src/config.ts
    - CONFIG_DIR: ~/.config/qlj-i18n --> ~/.config/transweave
    - PROJECT_CONFIG_FILENAME: .qlj-i18n.json --> .transweave.json
    - QLJ_I18N_API_KEY --> TRANSWEAVE_API_KEY
    - QLJ_I18N_SERVER --> TRANSWEAVE_SERVER

Step 3.2: CLI program identity
  - packages/cli/src/index.ts
    - .name('qlj-i18n') --> .name('transweave')
    - .description update

Step 3.3: Command messages
  - packages/cli/src/commands/login.ts
    - qlji_ prefix check --> tw_
    - Error messages update
  - packages/cli/src/commands/init.ts
    - All qlj-i18n references --> transweave
  - packages/cli/src/commands/pull.ts
    - All qlj-i18n references --> transweave
  - packages/cli/src/commands/push.ts
    - All qlj-i18n references --> transweave
```

**Verify:** `pnpm build:cli` passes.

### Phase 4: Web UI Branding (independent of API changes)

```
Step 4.1: Metadata and titles
  - packages/web/app/layout.tsx
    - title: "i18n Manager" --> "Transweave"
    - description update

Step 4.2: i18n strings
  - packages/web/i18n/all.json
    - header.title: "qlj-i18n" / "i18n Platform" --> "Transweave"
    - welcome.title update

Step 4.3: Cookie name
  - packages/web/lib/cookies.ts
    - LANGUAGE_COOKIE_KEY: 'i18n_language' --> 'tw_language'

Step 4.4: localStorage key (optional, lower priority)
  - packages/web/lib/auth/auth-context.tsx
  - packages/web/lib/api.ts
  - packages/web/lib/auth/axios-interceptor.ts
  - packages/web/api/upload.ts
  - packages/web/app/setup/page.tsx
    - 'authToken' --> 'tw_auth_token' (all 9 references)
```

**Verify:** `pnpm build:web` passes.

### Phase 5: Static Assets (new branding materials)

```
Step 5.1: Replace existing assets
  - packages/web/public/favicon.svg     <-- New Transweave design
  - packages/web/public/logo.svg        <-- New Transweave design
  - Remove: packages/web/public/fanyi.webp (old internal asset)
  - Remove: packages/web/public/tutu.jpg (old internal asset)
  - Remove: packages/web/public/next.svg (Next.js default, unused)
  - Remove: packages/web/public/vercel.svg (Vercel default, unused)

Step 5.2: Add new assets
  - packages/web/public/og-image.png    <-- For social sharing / link previews
  - packages/web/public/logo-dark.svg   <-- Dark mode variant (optional)

Step 5.3: Add OG meta tags
  - packages/web/app/layout.tsx metadata:
    openGraph: { images: ['/og-image.png'], ... }
```

### Phase 6: Docker Compose & Infrastructure

```
Step 6.1: Docker Compose image names
  - docker-compose.yml: Add image: tags
    server: transweave/server:latest
    web: transweave/web:latest

Step 6.2: Database defaults (cosmetic)
  - docker-compose.yml:
    POSTGRES_DB: ${POSTGRES_DB:-transweave}
    POSTGRES_USER: ${POSTGRES_USER:-transweave}
  - .env.example: update defaults to match

Step 6.3: GitHub Actions (if adding CI)
  - .github/workflows/ updates for new image names
```

**Verify:** `docker compose build && docker compose up -d` works.

### Phase 7: Documentation (must be last -- references everything above)

```
Step 7.1: README.md complete rewrite
Step 7.2: .env.example header and comments
Step 7.3: docs/api-reference.md updates
Step 7.4: .gitignore additions (.transweave.json should be in user projects, not this repo)
```

### Phase 8: Landing Page (can happen in parallel with Phase 5-7)

```
Step 8.1: Route group restructure
  - Move existing app routes into (app)/ route group
  - Create (landing)/ route group
Step 8.2: Landing page components
Step 8.3: Landing layout (no auth)
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Partial Rename
**What:** Changing some references but not others (e.g., package names but not Dockerfile filters).
**Why bad:** Build breaks silently. Docker builds fail with "no matching package" errors that are confusing to debug.
**Instead:** Use the complete inventory above as a checklist. Grep for `qlj` and `qlji` after completion to verify zero remaining references.

### Anti-Pattern 2: Backward-Compatible API Key Prefix
**What:** Supporting both `qlji_` and `tw_` prefixes simultaneously.
**Why bad:** Permanent code complexity for a pre-release project with zero external users.
**Instead:** Hard cut. If backward compatibility were ever needed (post-release), add a config option (`LEGACY_API_KEY_PREFIX=qlji_`) rather than hardcoding both.

### Anti-Pattern 3: Landing Page as Separate Package
**What:** Creating `packages/landing` with its own build pipeline.
**Why bad:** Doubles the frontend build infrastructure, requires a new Docker service or nginx routing, duplicates shared assets.
**Instead:** Route group in `packages/web/app/(landing)/`.

### Anti-Pattern 4: Renaming the Git Repository Directory
**What:** Renaming the local directory from `qlj-fe-i18n` to `transweave`.
**Why bad:** Breaks all absolute paths in shells, IDE configs, git worktrees. The directory name is irrelevant to the product -- only package.json names and Docker image names matter.
**Instead:** Leave the directory name as-is or rename it independently of the code changes. The GitHub repo can be named `transweave` regardless of local directory name.

### Anti-Pattern 5: Changing Everything in One Commit
**What:** A single massive commit with all rename changes.
**Why bad:** Impossible to bisect if something breaks. Hard to review.
**Instead:** Follow the phased approach above. Each phase is a logical commit that leaves the project buildable.

## Scalability Considerations

| Concern | Now (v1.1) | Future (v2+) |
|---------|------------|--------------|
| npm publishing | CLI only (`transweave` on npm) | Consider `@transweave/cli` scoped name if adding SDK packages later |
| Docker registry | Local builds only | Push to `ghcr.io/[org]/transweave-server` and `ghcr.io/[org]/transweave-web` |
| Multiple frontends | Single Next.js app with route groups | If landing page grows significantly, consider splitting to separate deployment |
| API versioning | No version prefix needed yet | Add `/api/v1/` prefix before v2 API changes |
| CLI backward compat | Not needed (pre-release) | Support `--legacy-config` flag if users have `.qlj-i18n.json` files |

## Post-Rename Verification Checklist

After all changes are complete, verify zero remaining references:

```bash
# Must return zero results (excluding pnpm-lock.yaml, node_modules, .git)
grep -r "qlj" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.js" \
  --include="*.yml" --include="*.yaml" --include="*.md" --include="*.svg" \
  --exclude-dir=node_modules --exclude-dir=.git --exclude=pnpm-lock.yaml .

# Specific patterns to verify are gone:
grep -r "qlji_" --exclude-dir=node_modules --exclude-dir=.git .
grep -r "qlj-i18n" --exclude-dir=node_modules --exclude-dir=.git .
grep -r "@qlj/" --exclude-dir=node_modules --exclude-dir=.git .
grep -r "QLJ_I18N" --exclude-dir=node_modules --exclude-dir=.git .
```

## Integration Points Summary

| Integration Point | Change Type | Affected Components |
|-------------------|-------------|---------------------|
| API key prefix (`qlji_` -> `tw_`) | Breaking | server auth guard, API key service, MCP controller, CLI login, docs |
| Package names | Build system | All 3 packages, both Dockerfiles, docker-compose |
| CLI binary name | User-facing | CLI package.json bin, bin file rename |
| CLI config paths | User-facing | CLI config.ts (global + project config paths) |
| CLI env vars | CI/CD | CLI config.ts (TRANSWEAVE_API_KEY, TRANSWEAVE_SERVER) |
| Cookie names | User-facing (minor) | Web cookies.ts |
| Encryption salt | Data migration | Server encryption.util.ts |
| MCP server name | MCP clients | Server mcp.service.ts |
| Page metadata | SEO | Web layout.tsx |
| i18n strings | UI text | Web i18n/all.json |
| Docker image names | Deployment | docker-compose.yml |
| Static assets | Visual branding | Web public/ directory |
| Landing page | New feature | Web app/(landing)/ route group |

## Sources

- Direct codebase analysis of all files in the repository (HIGH confidence)
- Next.js App Router route groups documentation (HIGH confidence -- well-established pattern)
- pnpm workspace filter documentation for scoped package names (HIGH confidence)
