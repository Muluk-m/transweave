# Domain Pitfalls: Renaming & Branding an Open-Source Project

**Domain:** Open-source developer tool rebranding (qlj-i18n to Transweave)
**Researched:** 2026-03-01
**Confidence:** HIGH (based on direct codebase audit of all naming touchpoints + community patterns)

---

## Critical Pitfalls

Mistakes that cause broken deployments, broken user workflows, or require emergency patches.

---

### Pitfall 1: API Key Prefix Change Silently Invalidates All Existing Keys

**What goes wrong:**
The API key system uses `qlji_` as a hard-coded prefix in 6 files across 12 code locations. The prefix is not cosmetic -- it is used as the **routing signal** for authentication. In `packages/server/src/jwt/guard.ts:36`, the auth guard checks `if (token.startsWith('qlji_'))` to decide whether a Bearer token is a JWT or an API key. In `packages/server/src/service/api-key.service.ts:22`, new keys are generated with `qlji_${randomPart}`. In `packages/cli/src/commands/login.ts:12`, the CLI rejects keys that do not start with `qlji_`.

If the prefix is renamed to `tw_` or `transweave_` during the rebrand, every API key ever issued becomes permanently invalid. Users who have configured CI/CD pipelines, MCP server connections, or CLI configs with existing `qlji_` keys will experience silent authentication failures.

**Why it happens:**
The prefix looks like "just branding" but it is load-bearing infrastructure. Developers rename it to match the new brand without realizing it is a functional part of the authentication pipeline, not a display string.

**Consequences:**
- All existing API keys fail authentication with no error message explaining why
- CI/CD pipelines using `qlji_` keys break silently
- MCP server connections from AI coding assistants stop working
- Users must regenerate all keys and reconfigure all integrations

**Prevention:**
1. **Do NOT rename the API key prefix.** Keep `qlji_` forever as a backward-compatible prefix. This is a protocol-level identifier, not a brand element. Stripe still uses `sk_` and `pk_` regardless of any branding changes.
2. If you absolutely must use a new prefix, implement dual-prefix support: accept both `qlji_` and `tw_` in the auth guard. New keys get the new prefix; old keys continue working.
3. Add a comment in `api-key.service.ts` explaining that the prefix is a stable API contract, not subject to rebranding.

**Detection:**
```bash
# Verify the prefix is NOT changed in these critical files:
grep -n "qlji_" packages/server/src/jwt/guard.ts
grep -n "qlji_" packages/server/src/service/api-key.service.ts
grep -n "qlji_" packages/cli/src/commands/login.ts
```

**Phase to address:** Rename phase -- by explicitly deciding to KEEP the prefix, not by oversight.

---

### Pitfall 2: Encryption Salt Change Breaks All Stored AI Provider API Keys

**What goes wrong:**
In `packages/server/src/ai/encryption.util.ts:17`, the encryption key derivation uses a hardcoded salt string: `scryptSync(secret, 'qlj-i18n-ai-salt', 32)`. This salt is not branding -- it is a cryptographic parameter. If someone renames it to `'transweave-ai-salt'` during the rebrand, all previously encrypted AI provider API keys (stored in the database) become permanently undecryptable. The `decryptApiKey()` function will throw "AI provider API key could not be decrypted" for every user.

**Why it happens:**
The string `qlj-i18n-ai-salt` looks like a branding artifact. A developer doing a global find-and-replace of `qlj-i18n` will change this salt without understanding its cryptographic significance.

**Consequences:**
- Every user's stored AI provider API key (OpenAI, Claude, DeepL, Google) becomes inaccessible
- Users must re-enter all API keys in settings
- No recovery possible without the original salt value
- Data corruption is silent until the user tries to use AI translation

**Prevention:**
1. **Do NOT change the salt string.** Add a comment above it:
   ```typescript
   // IMPORTANT: This salt is a cryptographic parameter, NOT a brand name.
   // Changing it will permanently break decryption of all stored AI API keys.
   // DO NOT rename during rebranding.
   ```
2. Add `encryption.util.ts` to an explicit "do not rebrand" exclusion list in the rename checklist.
3. If the salt must change for other reasons, write a data migration that decrypts with the old salt and re-encrypts with the new one.

**Detection:**
```bash
# This must still contain 'qlj-i18n-ai-salt' after the rename:
grep "ai-salt" packages/server/src/ai/encryption.util.ts
```

**Phase to address:** Rename phase -- as an explicit exclusion in the find-and-replace process.

---

### Pitfall 3: Incomplete Rename Leaves Ghost References in 20+ Locations

**What goes wrong:**
The old name `qlj-i18n` appears in 20+ files across 7 distinct naming patterns. A partial rename -- catching some but not all -- creates a jarring user experience where the old name leaks through in CLI output, error messages, log lines, config file paths, and documentation.

**Current naming inventory (audited):**

| Pattern | Files affected | Locations |
|---------|---------------|-----------|
| `@qlj/i18n-manager` | `package.json` (root) | 1 |
| `qlj-i18n-server` | `packages/server/package.json`, `packages/server/Dockerfile:15` | 2 |
| `qlj-i18n` (CLI package name) | `packages/cli/package.json` (name + bin + description) | 3 |
| `qlj-i18n` (CLI binary) | `packages/cli/bin/qlj-i18n.js`, `packages/cli/package.json:bin` | 2 |
| `qlj-i18n` (user-facing CLI text) | `packages/cli/src/index.ts`, all 4 command files | 8+ |
| `.qlj-i18n.json` (project config) | `packages/cli/src/config.ts` (4 references) | 4 |
| `~/.config/qlj-i18n/` (global config dir) | `packages/cli/src/config.ts:17` | 1 |
| `QLJ_I18N_API_KEY` (env var) | `packages/cli/src/config.ts:73` | 1 |
| `QLJ_I18N_SERVER` (env var) | `packages/cli/src/config.ts:86` | 1 |
| `qlj-i18n-mcp-server` | `packages/server/src/service/mcp.service.ts:24` | 1 |
| `QLJ i18n MCP Server` | `packages/server/src/controller/mcp.controller.ts` (HTML title, heading) | 3 |
| `Qlj i18n` (logo text) | `packages/web/components/Logo.tsx:61` | 1 |
| `qlj-logo-gradient` (SVG ID) | `packages/web/components/Logo.tsx:18,48` | 2 |
| `qlj-i18n` (i18n translation value) | `packages/web/i18n/all.json:48` | 1 |
| `i18n Manager` (page title) | `packages/web/app/layout.tsx:14` | 1 |
| `qlj-i18n` (README, docs) | `README.md`, `docs/api-reference.md` | 30+ |
| `qlj-i18n` (env example comment) | `.env.example:2` | 1 |
| `nextjs` (web package name) | `packages/web/package.json:2`, `packages/web/Dockerfile:17,34` | 3 |
| `qlj-i18n-ai-salt` | `packages/server/src/ai/encryption.util.ts:17` | 1 (DO NOT CHANGE) |
| `qlji_` (API key prefix) | 6 files, 12 locations | 12 (DO NOT CHANGE) |

**Why it happens:**
Names spread like weeds through a codebase. They appear in package.json names (used by pnpm filter), Dockerfile filter commands, CLI binary names, config directory paths, environment variable names, SVG element IDs, translation files, error messages, HTML meta tags, and documentation. No single grep pattern catches all variants (`qlj`, `qlj-i18n`, `@qlj`, `QLJ`, `Qlj`, `qlji_`).

**Prevention:**
Run a multi-pattern verification script after the rename:
```bash
# MUST return zero results (excluding node_modules, .git, pnpm-lock.yaml)
# Except for qlji_ prefix and qlj-i18n-ai-salt which should be kept
grep -rn --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" \
  --include="*.yml" --include="*.yaml" --include="*.env*" --include="Dockerfile*" \
  -E "(qlj-i18n|@qlj|QLJ_I18N|Qlj i18n|qlj-logo|i18n.Manager)" \
  --exclude-dir=node_modules --exclude-dir=.git \
  --exclude=pnpm-lock.yaml \
  .
```

**Phase to address:** Rename phase -- run verification as the final step, gate the PR on zero unexpected matches.

---

### Pitfall 4: Docker Volume Name Change Causes Data Loss on Upgrade

**What goes wrong:**
The current `docker-compose.yml` defines named volumes `pgdata` and `uploads`. If the docker-compose file is renamed or reorganized during the rebrand (e.g., changing the project directory name, adding a `name:` field to volumes, or changing volume names to `transweave_pgdata`), existing Docker deployments will create NEW empty volumes on `docker compose up`. The old volumes still exist on disk but are orphaned. Users lose their database and all uploaded files.

Docker Compose derives volume names from the project name (directory name by default): `<project>_<volume>`. If the repo directory changes from `qlj-fe-i18n` to `transweave`, Docker Compose will look for `transweave_pgdata` instead of `qlj-fe-i18n_pgdata`.

**Why it happens:**
Docker does not support `docker volume rename` (this is a known limitation, tracked in moby/moby#31154 since 2017). The volume naming is implicit and based on the project directory name. Developers rename the repo and don't realize Docker Compose has lost track of the old volumes.

**Consequences:**
- Database completely empty after upgrade -- all translations, users, teams gone
- Uploaded files (screenshots) lost
- No error message -- the app starts normally with a fresh setup wizard
- Recovery requires manually copying data between Docker volumes

**Prevention:**
1. **Add an explicit `name:` to each volume in docker-compose.yml** to decouple volume naming from the project directory:
   ```yaml
   volumes:
     pgdata:
       name: transweave_pgdata
     uploads:
       name: transweave_uploads
   ```
2. Document the upgrade path clearly in README: "If upgrading from qlj-i18n, rename your existing volumes..."
3. For users upgrading from the old name, provide a migration command:
   ```bash
   # Copy data from old volume to new volume
   docker run --rm -v qlj-fe-i18n_pgdata:/from -v transweave_pgdata:/to alpine sh -c "cp -a /from/. /to/"
   ```
4. Since this is a v1.0-to-v1.1 rename (few external users yet), the risk is low. But document it now for future renames.

**Detection:**
- Check that `docker-compose.yml` has explicit `name:` fields on all volumes
- After rename, verify `docker volume ls | grep pgdata` shows the expected volume name

**Phase to address:** Docker/deployment phase of the branding milestone.

---

## Moderate Pitfalls

Mistakes that cause confusion, wasted time, or unprofessional appearance.

---

### Pitfall 5: Landing Page Over-Engineering (Animations Over Content)

**What goes wrong:**
Developers spend 2-3 weeks building a landing page with scroll-triggered animations, parallax effects, interactive demos, and custom illustration systems. Meanwhile, the page lacks the three things visitors actually need: (1) a clear one-sentence description of what the product does, (2) a screenshot of the actual product, (3) a way to try it. Based on research of 100+ dev tool landing pages (Evil Martians, 2025), the most effective layouts use a centered hero with a bold headline, a product screenshot, and a call-to-action button.

**Why it happens:**
Landing page work feels creative and fun compared to the tedium of rename verification. The `motion` library is already in the web dependencies (`motion@^12.18.1`), making it tempting to add complex animations. Developers optimize for impressiveness rather than conversion.

**Prevention:**
1. Time-box the landing page to 3-5 days maximum.
2. Use a simple structure: Hero (headline + screenshot + CTA) -> Features (3-4 cards with icons) -> Quick Start (code block) -> Footer.
3. Content first, animation last. Write all copy before touching any CSS or motion code.
4. A static screenshot of the actual product UI is more convincing than any animation.
5. Do NOT build a custom design system for the landing page. Use the existing Tailwind + Radix setup.
6. Skip: custom illustrations, animated backgrounds, interactive demos, pricing tables (it's free), testimonials (too early).

**Detection:**
- Landing page PR has more animation/motion code than content text
- No actual product screenshot on the page
- "What does this do?" not answered above the fold

**Phase to address:** Landing page phase -- set scope constraints before starting.

---

### Pitfall 6: README Anti-Patterns That Kill GitHub Discoverability

**What goes wrong:**
The current README has several patterns that hurt discoverability:

1. **Title is `# qlj-i18n`** -- not keyword-rich, not descriptive. GitHub and Google heavily weight the first H1.
2. **No badges** -- stars, license, build status badges are missing. These create social proof and are indexed by search.
3. **No Open Graph image** -- when shared on social media or in Slack/Discord, there's no visual preview.
4. **"your-org" placeholder URLs** -- `https://github.com/your-org/qlj-i18n.git` in clone commands looks unfinished.
5. **No "About" section topics** -- the GitHub repo About section and topics are strong ranking signals.
6. **Generic description in metadata** -- `"description": ""` in root `package.json` misses npm search.

GitHub's search algorithm prioritizes: repo name > About description > README H1 > README content. Google indexes GitHub README content and weights headings, keyword density, and freshness.

**Why it happens:**
README optimization is treated as documentation work rather than marketing. Developers write READMEs for people who already found the project, not for people who might find it.

**Prevention:**
1. **Title:** `# Transweave` followed immediately by a one-liner: "Self-hosted i18n management platform for development teams."
2. **Badges:** Add license badge, build status, npm package version for CLI.
3. **Keywords in README:** Include "internationalization", "i18n", "translation management", "localization", "self-hosted" naturally in the first paragraph.
4. **GitHub About section:** Set to under 120 characters. Example: "Self-hosted i18n translation management platform. Next.js + NestJS."
5. **GitHub Topics:** Add at least 6: `i18n`, `internationalization`, `translation`, `localization`, `self-hosted`, `nextjs`, `nestjs`, `developer-tools`.
6. **Open Graph image:** Create a simple 1280x640 image with the logo and tagline for social sharing. Set via GitHub's Social Preview in repo settings.
7. **Fix placeholder URLs** to actual GitHub URLs before publishing.
8. **Fill `package.json` description** fields in all packages.

**Detection:**
```bash
# Check for placeholder URLs
grep -rn "your-org" README.md docs/
# Check for empty descriptions
grep '"description": ""' package.json packages/*/package.json
```

**Phase to address:** README rewrite phase -- treat it as a marketing deliverable, not a chore.

---

### Pitfall 7: Logo/Branding Inconsistency Across Touchpoints

**What goes wrong:**
The project has at least 7 places where visual branding appears, and they easily drift out of sync:

1. **Logo component** (`packages/web/components/Logo.tsx`) -- inline SVG with "Qlj i18n" text
2. **Favicon** (`packages/web/public/favicon.svg`) -- separate SVG file
3. **App icon** (`packages/web/app/icon.svg`) -- Next.js app icon
4. **Public logo** (`packages/web/public/logo.svg`) -- yet another SVG file
5. **Page title** (`packages/web/app/layout.tsx:14`) -- "i18n Manager" string
6. **MCP server HTML page** (`packages/server/src/controller/mcp.controller.ts:130,564`) -- "QLJ i18n MCP Server" in HTML
7. **Open Graph / social preview** -- not yet created
8. **README** -- header and any embedded images
9. **Landing page** -- if created separately
10. **CLI output** -- `packages/cli/src/index.ts` program name and description

After a rebrand, it is common for 2-3 of these to still show the old name or use a different color/shape version of the new logo.

**Why it happens:**
Each touchpoint was created independently. There is no single source of truth for the brand assets. The SVG gradient IDs reference `qlj-logo-gradient`, the text says "Qlj i18n", the title says "i18n Manager" -- three different names in one component.

**Prevention:**
1. Create a `brand/` or `assets/` directory at the repo root containing canonical brand files:
   - `logo.svg` (full logo)
   - `icon.svg` (icon only, for favicons)
   - `og-image.png` (social preview, 1280x640)
   - `brand.md` (color hex codes, font name, usage guidelines)
2. Generate all derived assets (favicon.ico, apple-touch-icon, etc.) from the canonical SVGs.
3. The `Logo.tsx` component should import or reference the canonical SVG, not contain its own inline copy.
4. After the rebrand, run a verification:
   ```bash
   # Check all brand touchpoints
   grep -rn "Qlj\|QLJ\|i18n Manager" \
     packages/web/components/Logo.tsx \
     packages/web/app/layout.tsx \
     packages/server/src/controller/mcp.controller.ts \
     packages/cli/src/index.ts \
     README.md
   ```
5. Standardize on one exact spelling: "Transweave" (capital T, no space, no hyphen).

**Detection:**
- Search for any of these strings after rebrand: "Qlj", "QLJ", "qlj", "i18n Manager"
- Compare favicons/icons visually across web app, MCP server page, and README

**Phase to address:** Logo/visual identity phase -- create canonical assets first, then update all touchpoints from that single source.

---

### Pitfall 8: CLI Breaking Changes (Binary Name, Config Paths, Env Vars)

**What goes wrong:**
The CLI tool has 5 user-facing identifiers that form an implicit API contract:

1. **Binary name:** `qlj-i18n` (in `packages/cli/package.json:bin`)
2. **Config directory:** `~/.config/qlj-i18n/` (in `packages/cli/src/config.ts:17`)
3. **Project config file:** `.qlj-i18n.json` (in `packages/cli/src/config.ts:19`)
4. **Environment variables:** `QLJ_I18N_API_KEY`, `QLJ_I18N_SERVER` (in `packages/cli/src/config.ts`)
5. **npm package name:** `qlj-i18n` (in `packages/cli/package.json:2`)

Renaming all of these to `transweave` breaks every existing user's setup: their global config disappears (wrong directory), their project configs are not found (wrong filename), their environment variables stop working, and `qlj-i18n pull` no longer exists as a command.

**Why it happens:**
The CLI has the largest user-facing surface area of any component. Unlike the web UI (where renaming a page title is harmless), the CLI has filesystem paths and environment variable names that users have baked into scripts, CI/CD pipelines, and documentation.

**Prevention:**
Since this is v1.1 and the CLI likely has very few external users yet, a clean break is acceptable:
1. Rename the binary to `transweave` and the npm package to `transweave`.
2. Rename the config directory to `~/.config/transweave/` and the project config to `.transweave.json`.
3. Rename env vars to `TRANSWEAVE_API_KEY` and `TRANSWEAVE_SERVER`.
4. **But:** add a one-time migration check. On first run, if `~/.config/qlj-i18n/` exists but `~/.config/transweave/` does not, print a message:
   ```
   Found legacy config at ~/.config/qlj-i18n/. Migrating to ~/.config/transweave/...
   ```
   Copy the config and continue.
5. Similarly, if `.qlj-i18n.json` exists but `.transweave.json` does not, auto-migrate.
6. Accept both old and new env var names for one major version, with a deprecation warning for the old names.

**Detection:**
```bash
# After rename, verify old names are gone from source (except migration code):
grep -rn "qlj-i18n\|QLJ_I18N" packages/cli/src/ --include="*.ts" | grep -v "migration\|legacy\|compat"
```

**Phase to address:** CLI rename sub-phase -- must include migration logic, not just find-and-replace.

---

### Pitfall 9: Dockerfile Filter Names Break Silently

**What goes wrong:**
Both Dockerfiles use pnpm `--filter` with the **package.json name** to target builds:
- `packages/server/Dockerfile:15` -- `pnpm --filter qlj-i18n-server build`
- `packages/web/Dockerfile:17` -- `pnpm --filter nextjs build`
- `packages/web/Dockerfile:34` -- `pnpm --filter nextjs start`

If `packages/server/package.json` name is changed to `@transweave/server` but the Dockerfile still says `--filter qlj-i18n-server`, the Docker build fails with a cryptic "No projects matched the filters" error. The same applies to the web package if `nextjs` is renamed but the Dockerfile is not updated.

**Why it happens:**
Dockerfiles are not part of the typical "rename in IDE" workflow. They use string references to package names, not imports that an IDE can track. The `pnpm --filter` command matches against the `name` field in `package.json`, creating an invisible coupling.

**Prevention:**
1. After renaming package.json names, immediately update all Dockerfiles:
   ```bash
   grep -rn "qlj-i18n-server\|nextjs" packages/*/Dockerfile
   ```
2. Run `docker compose build` as part of the rename verification. If it passes, the filter names are correct.
3. Consider using directory-based filters instead of name-based filters in Dockerfiles: `pnpm --filter ./packages/server build` instead of `pnpm --filter qlj-i18n-server build`. Directory filters are rename-proof.

**Detection:**
```bash
# Docker build will fail if filters don't match
docker compose build --no-cache 2>&1 | grep -i "no projects matched"
```

**Phase to address:** Rename phase -- verify immediately after package.json name changes.

---

### Pitfall 10: pnpm-lock.yaml Contains Old Package Names

**What goes wrong:**
The `pnpm-lock.yaml` file (462KB) contains internal references to package names. After renaming packages in `package.json` files, the lockfile may still reference old names. This causes `pnpm install --frozen-lockfile` to fail in Docker builds (where `--frozen-lockfile` is used), and `pnpm install` without the flag may produce unexpected dependency resolution changes.

**Why it happens:**
Developers rename `package.json` but forget to regenerate the lockfile. In CI/CD and Docker builds, `--frozen-lockfile` is standard practice, making the stale lockfile a hard failure.

**Prevention:**
1. After renaming all package.json names, run `pnpm install` to regenerate `pnpm-lock.yaml`.
2. Commit the updated lockfile in the same PR as the name changes.
3. Verify with:
   ```bash
   grep "qlj-i18n" pnpm-lock.yaml
   # Should only match the integrity hashes of external packages, not internal workspace references
   ```

**Phase to address:** Rename phase -- must be the last step after all package.json changes.

---

## Minor Pitfalls

Issues that cause minor annoyance or missed opportunities.

---

### Pitfall 11: GitHub Workflow Still References Old Branch Names

**What goes wrong:**
`.github/workflows/check-lock-file.yml` triggers on PRs to `main`, `develop`, `test`, `main-1`, and `master`. If the default branch is renamed during the rebrand or if the workflow doesn't cover the new branch structure, CI checks stop running.

**Prevention:**
1. Review all workflow files after branch structure changes.
2. Update branch triggers to match the new structure.
3. Also update the workflow's Chinese-language log messages to English for the open-source version.

---

### Pitfall 12: Over-Scoping the Branding Work

**What goes wrong:**
The branding milestone expands from "rename + logo + README" into a full marketing site with blog, changelog system, documentation portal, contributor guides, a custom domain, analytics, and SEO optimization. Each addition seems small but collectively turns a 1-2 week milestone into a 2-month project.

**Why it happens:**
Branding work has no natural stopping point. Every improvement suggests another. "We need a landing page" becomes "we need a blog" becomes "we need a documentation site" becomes "we need Algolia search" becomes "we need i18n on the docs site" (ironic for an i18n tool).

**Prevention:**
1. Define the scope explicitly and refuse expansion:
   - IN: Rename in code, logo SVG, favicon, OG image, README rewrite, single-page landing (can be the README itself)
   - OUT: Blog, docs site, custom domain setup, analytics, contributor guide, changelog automation, social media accounts
2. The README IS the landing page for 95% of developer tools at this stage. Do not build a separate site until GitHub stars exceed 100.
3. Landing page content can live at the repo root as `index.html` or be hosted via GitHub Pages with zero custom infrastructure.

**Detection:**
- PR for branding milestone has files in more than 5 directories
- Any new npm dependencies added for the landing page (static site generators, MDX, etc.)
- Work continuing past the 2-week timebox

**Phase to address:** Milestone planning -- set explicit scope boundaries before starting any work.

---

### Pitfall 13: Forgetting the MCP Server HTML Page

**What goes wrong:**
The MCP controller at `packages/server/src/controller/mcp.controller.ts` contains an embedded HTML page (lines 130-710+) with the title "QLJ i18n MCP Server", branding text, and example configuration showing `qlj-i18n` as the MCP server name. This is a full HTML page served at the MCP endpoint, and it is easy to miss because it is embedded inside a TypeScript file as a template string rather than being a separate HTML file.

**Prevention:**
1. Search specifically for HTML content in TypeScript files:
   ```bash
   grep -n "<title>" packages/server/src/controller/mcp.controller.ts
   grep -n "<h1>" packages/server/src/controller/mcp.controller.ts
   grep -n "qlj-i18n" packages/server/src/controller/mcp.controller.ts
   ```
2. Consider extracting the HTML into a separate template file during the rebrand. This makes future updates easier.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Code rename (find-replace) | Changing `qlji_` prefix or `qlj-i18n-ai-salt` | Create explicit exclusion list; review every change in the diff |
| Package.json renames | Dockerfile `--filter` commands break | Test `docker compose build` immediately after renaming |
| CLI rename | Users lose config files | Add legacy config migration on first run |
| Logo creation | Inconsistent across touchpoints | Create canonical source, derive all others from it |
| Landing page | Scope creep into full marketing site | Timebox to 3-5 days; content before animation |
| README rewrite | Generic description, no keywords | Treat as marketing; include "i18n", "self-hosted", "translation management" in H1 and first paragraph |
| Docker compose | Volume names change implicitly | Add explicit `name:` to volume definitions |
| OG/social images | Forgotten entirely | Create 1280x640 PNG; set in GitHub repo settings |
| Env var rename (CLI) | Existing scripts break | Accept both old and new names with deprecation warning |
| pnpm-lock.yaml | Stale after package renames | Run `pnpm install` and commit updated lockfile |

## Rename Verification Checklist

Run after all rename work is complete. Every check must pass before merging.

```bash
# 1. Find ALL remaining old-name references (SHOULD return zero results)
#    Excludes: qlji_ prefix, ai-salt, node_modules, .git, lockfile
grep -rn --include="*.ts" --include="*.tsx" --include="*.json" \
  --include="*.md" --include="*.yml" --include="*.yaml" \
  --include="*.env*" --include="Dockerfile*" --include="*.html" \
  --exclude-dir=node_modules --exclude-dir=.git \
  --exclude=pnpm-lock.yaml \
  -E "qlj-i18n|@qlj/|QLJ_I18N|Qlj i18n|qlj-logo|i18n.Manager|qlj-i18n-server" .

# 2. Verify protected strings are STILL present (SHOULD return matches)
grep "qlji_" packages/server/src/service/api-key.service.ts
grep "qlj-i18n-ai-salt" packages/server/src/ai/encryption.util.ts

# 3. Verify Dockerfile filter names match package.json names
SRVNAME=$(node -p "require('./packages/server/package.json').name")
WEBNAME=$(node -p "require('./packages/web/package.json').name")
grep "$SRVNAME" packages/server/Dockerfile
grep "$WEBNAME" packages/web/Dockerfile

# 4. Verify Docker build works
docker compose build --no-cache

# 5. Verify pnpm workspace integrity
pnpm install --frozen-lockfile

# 6. Verify no old-name config paths in CLI
grep -n "qlj-i18n" packages/cli/src/config.ts | grep -v "legacy\|compat\|migration"

# 7. Check brand consistency
grep -rn "Transweave\|transweave" packages/web/components/Logo.tsx packages/web/app/layout.tsx README.md
```

## "Looks Done But Isn't" Checklist

- [ ] **API key prefix:** Verified `qlji_` is intentionally kept, not accidentally left behind
- [ ] **Encryption salt:** Verified `qlj-i18n-ai-salt` is intentionally kept with explanatory comment added
- [ ] **MCP server HTML:** All `<title>`, `<h1>`, example configs updated inside the TypeScript template string
- [ ] **CLI binary file:** `packages/cli/bin/qlj-i18n.js` renamed AND package.json `bin` field updated
- [ ] **CLI error messages:** All user-facing `console.error` and `console.log` messages reference new name
- [ ] **Docker volumes:** Explicit `name:` field added to prevent implicit renaming
- [ ] **pnpm-lock.yaml:** Regenerated after all package.json name changes
- [ ] **GitHub repo About:** Description filled in, topics added, social preview image uploaded
- [ ] **OG image:** Created and referenced in HTML meta tags
- [ ] **Chinese strings in workflow:** `check-lock-file.yml` echo messages translated to English
- [ ] **i18n translation file:** `packages/web/i18n/all.json` entry at line 48 updated from `qlj-i18n`
- [ ] **Favicon files:** All three (`favicon.svg`, `logo.svg`, `icon.svg`) updated to new design
- [ ] **Page metadata:** `layout.tsx` title and description updated to "Transweave" with keyword-rich description

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| API key prefix changed | HIGH | Revert the prefix immediately. If already deployed, users must regenerate all API keys. No way to recover old keys. |
| Encryption salt changed | HIGH | If old salt is known, write a one-time migration script to decrypt-with-old/re-encrypt-with-new. If old salt is lost, all stored AI keys are unrecoverable. |
| Docker volumes lost | MEDIUM | If old volumes still exist on disk (`docker volume ls`), copy data to new volumes. If `docker volume prune` was run, data is gone; restore from backup. |
| Partial rename (ghost references) | LOW | Run the verification checklist, fix remaining references, re-deploy. Cosmetic issue only. |
| CLI config path changed without migration | LOW | Manually copy `~/.config/qlj-i18n/config.json` to `~/.config/transweave/config.json`. Or add the migration code to the next CLI release. |
| Landing page over-scoped | LOW | Cut scope immediately. Ship what exists. A minimal README is better than an unfinished marketing site. |

## Sources

- Direct codebase audit of `/Users/qian/Projects/Qlj/qlj-fe-i18n` (all grep results verified against live source)
- [Docker/moby#31154: Docker volume rename not supported](https://github.com/moby/moby/issues/31154) -- Docker volumes cannot be renamed; workaround is copy
- [CodeStudy: Docker Volume Rename Workarounds](https://www.codestudy.net/blog/docker-volume-rename-or-copy-operation/) -- volume migration strategy
- [Nakora: GitHub SEO -- Rank Your Repo](https://nakora.ai/blog/github-seo) -- repo name, about section, topics as ranking signals (MEDIUM confidence)
- [Evil Martians: 100 Dev Tool Landing Pages Study (2025)](https://evilmartians.com/chronicles/we-studied-100-devtool-landing-pages-here-is-what-actually-works-in-2025) -- hero + screenshot + CTA pattern (MEDIUM confidence)
- [DEV Community: GitHub SEO for 2025](https://dev.to/infrasity-learning/the-ultimate-guide-to-github-seo-for-2025-38kl) -- keyword placement in README headings
- [Codemotion: GitHub Project Visibility and SEO](https://www.codemotion.com/magazine/dev-life/github-project/) -- GitHub topics and About section optimization
- [npm Docs: Renaming an Organization](https://docs.npmjs.com/renaming-an-organization/) -- manual migration required for npm org rename
- [Medium: Lerna -- A Tale of Renaming NPM Packages](https://medium.com/@dlacustodio/lerna-a-tale-of-renaming-npm-packages-4d3c534bc31) -- monorepo package rename challenges

---
*Pitfalls research for: Transweave v1.1 branding & rename milestone*
*Researched: 2026-03-01*
