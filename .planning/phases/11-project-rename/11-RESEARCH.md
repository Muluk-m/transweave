# Phase 11: Project Rename - Research

**Researched:** 2026-03-02
**Domain:** Monorepo rename — package names, CLI binary, MCP server, Docker, UI strings, documentation
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REN-01 | All package.json names updated from qlj-i18n/nextjs to transweave scoped names | Complete file+line inventory below |
| REN-02 | Dockerfile --filter flags updated to match new package names | web/Dockerfile:17,34 and server/Dockerfile:15 identified |
| REN-03 | CLI binary renamed from qlj-i18n to transweave (bin, commands, config paths, env vars) | 12 references in 5 CLI source files + bin file |
| REN-04 | MCP server name updated from qlj-i18n-mcp-server to transweave-mcp-server | mcp.service.ts:24 and mcp.controller.ts:591 identified |
| REN-05 | Web UI titles, i18n strings updated to Transweave | layout.tsx already done; i18n/all.json:48 is the one remaining |
| REN-06 | Docker Compose service names and volume names updated with explicit name fields | docker-compose.yml has implicit names — add name: fields |
| REN-07 | Documentation (README, API reference, .env.example) updated to Transweave | README.md, docs/api-reference.md, .env.example, .env identified |
| REN-08 | API key prefix qlji_ and encryption salt qlj-i18n-ai-salt preserved unchanged | encryption.util.ts:17 — DO NOT touch; guard.ts — qlji_ must stay |
| REN-09 | grep verification passes — zero remaining qlj-i18n/qlj_/nextjs references except preserved ones | Verification command pattern documented in Code Examples |
</phase_requirements>

---

## Summary

This phase is a **pure text-substitution task** with one critical constraint: two identifiers (`qlji_` API key prefix and `qlj-i18n-ai-salt` encryption salt) are load-bearing infrastructure that cannot be renamed. Every other reference to the old brand is safe to change.

The codebase grep reveals exactly **18 affected files** spanning 6 categories: package.json files (4), Dockerfiles (2), CLI source files (5 + 1 bin file), server source files (2), web i18n file (1), and documentation/config files (4). The rename is mechanical — no logic changes, no new dependencies, no architecture shifts. The only tricky part is the bin file rename (`bin/qlj-i18n.js` → `bin/transweave.js`) which must stay in sync with the `package.json` bin field.

Docker Compose currently uses implicit volume names (`pgdata`, `uploads`) and generic service names (`postgres`, `server`, `web`). The requirement is to add explicit `name:` fields to volumes (so they become `transweave-pgdata`, `transweave-uploads`) — but this must be done carefully as Docker will treat them as new volumes, orphaning old data. The planner should warn users to back up data before this step.

**Primary recommendation:** Execute renames in dependency order — package.json first (so Dockerfiles match), then CLI binary, then server service names, then UI strings, then docs, then verify with grep.

---

## Complete Rename Inventory (Verified by Grep)

This is the authoritative, file-by-file list from actual codebase inspection. The planner should use these exact file paths and line numbers.

### Category 1: Package Names (REN-01)

| File | Line | Old Value | New Value |
|------|------|-----------|-----------|
| `package.json` | 2 | `"@qlj/i18n-manager"` | `"@transweave/manager"` |
| `packages/server/package.json` | 2 | `"qlj-i18n-server"` | `"@transweave/server"` |
| `packages/web/package.json` | 2 | `"nextjs"` | `"@transweave/web"` |
| `packages/cli/package.json` | 2 | `"qlj-i18n"` | `"transweave"` |
| `packages/cli/package.json` | 4 | `"CLI tool for qlj-i18n translation management"` | `"CLI tool for Transweave translation management"` |
| `packages/cli/package.json` | 6 | `"qlj-i18n": "./bin/qlj-i18n.js"` | `"transweave": "./bin/transweave.js"` |

**Note on root package.json:** The `scripts` block in root `package.json` uses `--filter ./packages/server` and `--filter ./packages/web` (path-based filters), NOT name-based. These do NOT need updating.

### Category 2: Dockerfile --filter Flags (REN-02)

| File | Line | Old Value | New Value |
|------|------|-----------|-----------|
| `packages/web/Dockerfile` | 17 | `pnpm --filter nextjs build` | `pnpm --filter @transweave/web build` |
| `packages/web/Dockerfile` | 34 | `pnpm --filter nextjs start` | `pnpm --filter @transweave/web start` |
| `packages/server/Dockerfile` | 15 | `pnpm --filter qlj-i18n-server build` | `pnpm --filter @transweave/server build` |

### Category 3: CLI Binary + Source (REN-03)

**Bin file rename (filesystem operation):**
- `packages/cli/bin/qlj-i18n.js` → `packages/cli/bin/transweave.js` (the file itself stays as `#!/usr/bin/env node\nrequire('../dist/index.js');` — only the filename changes)

**Source file changes:**

| File | Line | Old Value | New Value |
|------|------|-----------|-----------|
| `packages/cli/src/config.ts` | 17 | `'.config', 'qlj-i18n'` | `'.config', 'transweave'` |
| `packages/cli/src/config.ts` | 19 | `'.qlj-i18n.json'` | `'.transweave.json'` |
| `packages/cli/src/config.ts` | 22 (comment) | `~/.config/qlj-i18n/config.json` | `~/.config/transweave/config.json` |
| `packages/cli/src/config.ts` | 37 (comment) | `~/.config/qlj-i18n/config.json` | `~/.config/transweave/config.json` |
| `packages/cli/src/config.ts` | 45 (comment) | `.qlj-i18n.json` | `.transweave.json` |
| `packages/cli/src/config.ts` | 61 (comment) | `.qlj-i18n.json` | `.transweave.json` |
| `packages/cli/src/config.ts` | 70 (comment) | `QLJ_I18N_API_KEY` | `TRANSWEAVE_API_KEY` |
| `packages/cli/src/config.ts` | 73 | `process.env.QLJ_I18N_API_KEY` | `process.env.TRANSWEAVE_API_KEY` |
| `packages/cli/src/config.ts` | 83 (comment) | `QLJ_I18N_SERVER` | `TRANSWEAVE_SERVER` |
| `packages/cli/src/config.ts` | 86 | `process.env.QLJ_I18N_SERVER` | `process.env.TRANSWEAVE_SERVER` |
| `packages/cli/src/index.ts` | 8 | `.name('qlj-i18n')` | `.name('transweave')` |
| `packages/cli/src/index.ts` | 9 | `'CLI for qlj-i18n translation management'` | `'CLI for Transweave translation management'` |
| `packages/cli/src/commands/init.ts` | 6 (description) | `(.qlj-i18n.json)` | `(.transweave.json)` |
| `packages/cli/src/commands/init.ts` | 16 | `Run "qlj-i18n login" first.` | `Run "transweave login" first.` |
| `packages/cli/src/commands/init.ts` | 44 | `Initialized qlj-i18n config for project` | `Initialized Transweave config for project` |
| `packages/cli/src/commands/init.ts` | 49 | `Config saved to .qlj-i18n.json` | `Config saved to .transweave.json` |
| `packages/cli/src/commands/pull.ts` | 22 | `Run "qlj-i18n init" first.` | `Run "transweave init" first.` |
| `packages/cli/src/commands/pull.ts` | 29 | `Run "qlj-i18n login" first.` | `Run "transweave login" first.` |
| `packages/cli/src/commands/push.ts` | 17 | `Run "qlj-i18n init" first.` | `Run "transweave init" first.` |
| `packages/cli/src/commands/push.ts` | 24 | `Run "qlj-i18n login" first.` | `Run "transweave login" first.` |
| `packages/cli/src/commands/login.ts` | 8 | `starts with qlji_` | `starts with qlji_` (DO NOT CHANGE — qlji_ is load-bearing) |

**IMPORTANT:** `packages/cli/src/commands/login.ts` lines 8, 12, 13 reference `qlji_` — these are the preserved API key prefix, NOT the CLI tool name. Leave them unchanged.

### Category 4: MCP Server Name (REN-04)

| File | Line | Old Value | New Value |
|------|------|-----------|-----------|
| `packages/server/src/service/mcp.service.ts` | 24 | `name: 'qlj-i18n-mcp-server'` | `name: 'transweave-mcp-server'` |
| `packages/server/src/controller/mcp.controller.ts` | 591 | `<span class="info-value">qlj-i18n-mcp-server</span>` | `<span class="info-value">transweave-mcp-server</span>` |
| `packages/server/src/controller/mcp.controller.ts` | 710 | `"qlj-i18n": {` (MCP config key in HTML) | `"transweave": {` |

**Note on mcp.controller.ts line 713:** `"Authorization": "Bearer qlji_YOUR_API_KEY_HERE"` — keep `qlji_` unchanged (it is the actual API key prefix that users must use).

### Category 5: Web UI Strings (REN-05)

| File | Line | Old Value | New Value |
|------|------|-----------|-----------|
| `packages/web/i18n/all.json` | 48 | `"en-US": "qlj-i18n"` | `"en-US": "Transweave"` |

**Already done (no action needed):**
- `packages/web/app/layout.tsx` — already says "Transweave" in metadata title and OG tags (completed in Phase 10)

### Category 6: Docker Compose Volume Names (REN-06)

Current `docker-compose.yml` has implicit volume names (`pgdata`, `uploads`) and generic service names. Add explicit `name:` fields to volumes only — service keys (`postgres`, `server`, `web`) can stay as they are (they are internal service identifiers, not brand names).

```yaml
# docker-compose.yml volumes section — add name: fields
volumes:
  pgdata:
    name: transweave-pgdata
  uploads:
    name: transweave-uploads
```

**WARNING:** Adding `name:` fields to existing unnamed volumes causes Docker to treat them as new volumes. This is a data migration concern. The planner MUST include a warning step: users must back up data before running `docker compose up` after this change, or the old data volumes become orphaned.

### Category 7: Documentation and Config (REN-07)

| File | Scope of Change |
|------|----------------|
| `README.md` | Title (line 1), all `qlj-i18n` references in CLI examples, repository URLs, directory listing |
| `docs/api-reference.md` | Title (line 1), MCP config key (line 1197), `npm install` command (line 1244), all CLI command table rows (lines 1251-1254), env var table (lines 1260-1261) |
| `.env.example` | Header comment (line 2) |
| `.env` | Header comment (line 2) — this file is gitignored but the change should be made locally |

### Category 8: Preserved Identifiers (REN-08 — DO NOT CHANGE)

| Identifier | Location | Why Preserved |
|------------|----------|---------------|
| `qlji_` API key prefix | `packages/server/src/service/api-key.service.ts:22`, `guard.ts:37`, `mcp.controller.ts:28,33`, `cli/src/commands/login.ts:12,13` | Auth routing signal — changing this would invalidate all existing API keys |
| `qlj-i18n-ai-salt` | `packages/server/src/ai/encryption.util.ts:17` | AES-256-GCM encryption salt for stored AI provider keys — changing this would corrupt/break all stored AI API keys |
| `qlji_` in docs/api-reference.md | Many lines showing `Bearer qlji_...` examples | These are documentation of the actual prefix users must use, not branding |

---

## Architecture Patterns

### Pattern 1: pnpm --filter Name-Based vs Path-Based

pnpm supports both filter forms:
- `--filter nextjs` (name-based, matches `"name": "nextjs"` in package.json)
- `--filter ./packages/web` (path-based, always works regardless of package name)

The root `package.json` scripts use **path-based** filters (`--filter ./packages/web`), so they do NOT need updating. The Dockerfiles use **name-based** filters, so they DO need updating to match the new package names.

### Pattern 2: bin Field + Physical File Must Stay in Sync

The CLI `package.json` bin field declares:
```json
"bin": {
  "transweave": "./bin/transweave.js"
}
```
The physical file `bin/transweave.js` must exist. Both must change together. Steps:
1. Rename `bin/qlj-i18n.js` → `bin/transweave.js`
2. Update `package.json` bin field

### Pattern 3: Docker Volume Rename Requires Data Migration Warning

Docker named volumes have a `name:` field that defaults to `<project>_<volume_key>` when not set. Adding an explicit `name:` field overrides this. When users run `docker compose up` after this change:
- Docker creates NEW volumes with the new names
- OLD implicit volumes (`qlj-fe-i18n_pgdata`, `qlj-fe-i18n_uploads` or similar) become orphaned
- Data in old volumes is NOT automatically migrated

The task that adds `name:` fields must include a user-visible warning comment in `docker-compose.yml` and a README note.

### Pattern 4: Verification Grep Command

After all renames, run this to confirm zero remaining old-name references:

```bash
# Should return zero matches (only qlji_ and qlj-i18n-ai-salt are allowed)
grep -r "qlj-i18n\|@qlj/\|QLJ_I18N\|\"nextjs\"" \
  --include="*.ts" --include="*.tsx" --include="*.json" \
  --include="*.yml" --include="*.yaml" --include="*.md" \
  --include="*.js" --include="*.env*" \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist \
  /Users/qian/Projects/Qlj/qlj-fe-i18n

# Verify preserved identifiers still exist (should show matches)
grep -r "qlji_\|qlj-i18n-ai-salt" \
  --include="*.ts" --exclude-dir=node_modules \
  /Users/qian/Projects/Qlj/qlj-fe-i18n
```

### Anti-Patterns to Avoid

- **Global search-replace of "qlj"**: Would corrupt `qlji_` prefix and `qlj-i18n-ai-salt` salt. Always search for `qlj-i18n` specifically, never bare `qlj`.
- **Renaming pnpm-workspace.yaml**: The workspace file uses path globs, not package names. Leave unchanged.
- **Renaming `.next` build artifacts**: The `.next` directory contains compiled output. Renames only affect source files.
- **Forgetting to rename the bin file itself**: Updating only `package.json` without renaming `bin/qlj-i18n.js` → `bin/transweave.js` will break `npm install -g transweave`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Finding all rename targets | Manual file inspection | grep/ripgrep with exact patterns | Codebase already fully inventoried above |
| Verifying completeness | Manual review | Verification grep command above | Systematic, repeatable |
| Docker volume data migration | Custom scripts | User documentation + warning in compose file | Migration complexity is user's responsibility; tool doesn't know their data |

---

## Common Pitfalls

### Pitfall 1: Renaming qlji_ Prefix
**What goes wrong:** A developer does a broad "qlj" replace and changes `qlji_` to `transw_` or similar.
**Why it happens:** `qlji_` looks like a brand prefix.
**How to avoid:** The grep command for verification specifically targets `qlj-i18n` (hyphenated), not bare `qlj`. Every edit should target `qlj-i18n` specifically.
**Warning signs:** Grep verification shows no `qlji_` in `guard.ts` or `api-key.service.ts`.

### Pitfall 2: Renaming the Encryption Salt
**What goes wrong:** `qlj-i18n-ai-salt` in `encryption.util.ts` gets renamed.
**Why it happens:** It contains `qlj-i18n` exactly, matching the rename pattern.
**How to avoid:** This file (`encryption.util.ts`) should be explicitly excluded from rename operations, or the specific line protected.
**Warning signs:** Users report "AI provider API key could not be decrypted" error after rename.

### Pitfall 3: Docker Volume Orphaning
**What goes wrong:** After adding `name:` fields to docker-compose.yml, running `docker compose up` creates new empty volumes while old data volumes become orphaned.
**Why it happens:** Docker treats the `name:` field as the canonical volume identity.
**How to avoid:** The task that updates docker-compose.yml must include a clear user-facing warning comment. The planner should add a verification step prompting the user to acknowledge this.
**Warning signs:** All data appears missing after `docker compose up`.

### Pitfall 4: pnpm Workspace Filter Mismatch
**What goes wrong:** Dockerfiles are updated to use new `@transweave/web` name but the package.json is not yet updated (or vice versa). Build fails with "No packages found by filter".
**Why it happens:** The `--filter` flag in Dockerfile must match the `"name"` field in the target package.json exactly.
**How to avoid:** Update package.json and Dockerfile in the same task, or verify both in sequence.
**Warning signs:** `pnpm --filter @transweave/web build` fails with filter-not-found error.

### Pitfall 5: CLI Binary Not Installed After Rename
**What goes wrong:** The bin file is renamed in package.json but the physical file `bin/qlj-i18n.js` is not renamed to `bin/transweave.js`.
**Why it happens:** Two separate changes required (package.json + filesystem rename).
**How to avoid:** Treat as atomic: rename file + update package.json in same task.
**Warning signs:** `which transweave` returns nothing after `npm install -g`.

---

## Code Examples

### Example 1: Updated CLI package.json bin field
```json
{
  "name": "transweave",
  "version": "1.0.0",
  "description": "CLI tool for Transweave translation management",
  "bin": {
    "transweave": "./bin/transweave.js"
  }
}
```

### Example 2: Updated Dockerfile --filter (web)
```dockerfile
# packages/web/Dockerfile
RUN pnpm --filter @transweave/web build
CMD ["pnpm", "--filter", "@transweave/web", "start"]
```

### Example 3: Updated CLI config.ts constants
```typescript
// packages/cli/src/config.ts
const CONFIG_DIR = path.join(os.homedir(), '.config', 'transweave');
const GLOBAL_CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');
const PROJECT_CONFIG_FILENAME = '.transweave.json';

// getApiKey():
const envKey = process.env.TRANSWEAVE_API_KEY;

// getServer():
const envServer = process.env.TRANSWEAVE_SERVER;
```

### Example 4: Updated MCP server name
```typescript
// packages/server/src/service/mcp.service.ts
this.server = new McpServer({
  name: 'transweave-mcp-server',
  version: '1.0.0',
});
```

### Example 5: Docker Compose volumes with explicit names
```yaml
# docker-compose.yml
volumes:
  pgdata:
    name: transweave-pgdata
  uploads:
    name: transweave-uploads
```

### Example 6: Updated i18n header title
```json
// packages/web/i18n/all.json
"header": {
  "title": {
    "zh-CN": "Transweave",
    "en-US": "Transweave"
  }
}
```

### Example 7: MCP client config snippet (updated, in mcp.controller.ts HTML)
```json
{
  "mcpServers": {
    "transweave": {
      "url": "http://localhost:3001/api/mcp",
      "headers": {
        "Authorization": "Bearer qlji_YOUR_API_KEY_HERE"
      }
    }
  }
}
```
Note: the `qlji_` prefix in the authorization value stays — it's what the server expects.

---

## Standard Stack

This phase uses only built-in tools. No new dependencies needed.

### Core
| Tool | Purpose | Why Standard |
|------|---------|--------------|
| Text editor / sed | In-place file edits | Standard file manipulation |
| `git mv` | Rename bin file with history | Preserves git history for the binary |
| grep/ripgrep | Verification | Already available in project |
| pnpm | Package workspace management | Already in use |

### No New Dependencies
- Zero new npm packages
- Zero new devDependencies
- Zero configuration file additions

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| `qlj-i18n` unscoped CLI package name | `transweave` unscoped name | Simpler install: `npm install -g transweave` |
| `@qlj/i18n-manager` scoped root package | `@transweave/manager` scoped name | Consistent brand namespace |
| `qlj-i18n-server` server package | `@transweave/server` scoped name | Consistent brand namespace |
| `nextjs` generic web package name | `@transweave/web` scoped name | Eliminates generic name conflict |
| `QLJ_I18N_API_KEY` env var | `TRANSWEAVE_API_KEY` env var | Brand-consistent for users |
| `~/.config/qlj-i18n/` config dir | `~/.config/transweave/` config dir | Brand-consistent for users |

---

## Open Questions

1. **zh-CN header title in i18n/all.json**
   - What we know: Current value is `"zh-CN": "i18n Platform"` (line 47) — no old brand there
   - What's unclear: Should zh-CN also say "Transweave" (brand name is not translated) or keep "i18n Platform"?
   - Recommendation: Change to "Transweave" since it is a brand name and should not be localized

2. **Docker volume data migration documentation**
   - What we know: Adding `name:` fields to existing unnamed volumes creates new empty volumes
   - What's unclear: Whether existing users will have data in the old implicit volumes
   - Recommendation: Add a visible WARNING comment in docker-compose.yml near the `name:` fields, and note in task verification

3. **The .env file (gitignored)**
   - What we know: `.env` has `# qlj-i18n Environment Configuration` on line 2
   - What's unclear: Should the planner include a task to update the local `.env` file?
   - Recommendation: Yes — update `.env` header comment in the same task as `.env.example` since it's a developer-facing file even if gitignored

4. **MCP server registration key in user config**
   - What we know: The HTML docs (mcp.controller.ts) show `"qlj-i18n": { ... }` as the MCP server config key name
   - What's unclear: Is this just documentation, or does the server validate this key?
   - Recommendation: The key is user-chosen (it's the client-side alias, not validated by server), so renaming the documented example to `"transweave"` is cosmetic. Do it.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase grep — all findings are from actual file inspection at commit state 2026-03-02
- `packages/cli/src/config.ts` — CLI config paths and env vars
- `packages/server/src/ai/encryption.util.ts` — confirms `qlj-i18n-ai-salt` is the AES-256-GCM scrypt salt
- `packages/server/src/jwt/guard.ts` — confirms `qlji_` is the API key routing signal
- `packages/server/src/service/mcp.service.ts` — MCP server name registration
- `docker-compose.yml` — confirms implicit volume names (no `name:` fields present)

### Secondary (MEDIUM confidence)
- `.planning/research/SUMMARY.md` — prior inventory cross-referenced and verified against actual code

### Tertiary (LOW confidence)
- None — all findings directly verified in codebase

---

## Metadata

**Confidence breakdown:**
- Rename inventory: HIGH — every file and line number verified by grep against actual code
- Preserved identifiers: HIGH — confirmed by reading encryption.util.ts and guard.ts
- Docker volume warning: HIGH — confirmed by reading docker-compose.yml (no `name:` fields exist)
- Verification grep command: HIGH — pattern derived from actual codebase structure

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (stable codebase — rename inventory won't change unless new qlj-i18n references are added)
