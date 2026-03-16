## Context

The Transweave CLI (`packages/cli`) has 4 commands (login, init, pull, push) built with Commander.js. The API client uses bare `fetch()` with no timeout or retry. Error handling is copy-pasted across commands. The `pull` command has a fragile try/catch fallback between two different server endpoints. There is no interactive mode — all inputs must be passed as flags.

The server already exposes all endpoints needed for new features: `/api/tokens/:id/progress`, `/api/tokens/:id/search`, `/api/project/import/preview`, `/api/auth/status`, `/api/project/all`.

## Goals / Non-Goals

**Goals:**

- Make the CLI resilient to transient network issues (timeout, retry).
- Provide clear, actionable error messages with structured error types.
- Add `status`, `diff`, `whoami`, `search` commands using existing server APIs.
- Interactive prompts when flags are omitted; flags-first for CI compatibility.
- `--json` and `--quiet` output modes for scripting/CI.
- `--dry-run` for push, `--fail-under` for status, `--module` for pull.

**Non-Goals:**

- JWT/password-based authentication — stick with API Key only.
- Offline mode or local caching/lock files.
- Watch mode (file system polling for auto-sync).
- Server-side API changes — work entirely with existing endpoints.
- Publishing to npm (separate concern, happens later).

## Decisions

### 1. API Client: timeout + retry via AbortController and simple loop

**Decision**: Implement timeout with `AbortController` (30s default, configurable per-call) and retry transient errors (network failures, 5xx) up to 2 times with exponential backoff (1s, 3s). Do not retry 4xx errors.

**Alternatives considered**:
- Pull in a library like `ky` or `got` — adds dependency weight for a CLI tool that should stay lean. `fetch` + `AbortController` is sufficient.
- No retry at all — acceptable for local dev but hurts CI reliability where transient failures are common.

### 2. Error classes: custom hierarchy

**Decision**: Create a small error hierarchy:

```
TransweaveError (base)
├── AuthError        (401/403 — "Run transweave login" hint)
├── NotFoundError    (404 — project/token not found)
├── NetworkError     (fetch failure, timeout)
└── ServerError      (5xx — "Server issue, try again")
```

Each error carries `statusCode`, `endpoint`, and a user-friendly `hint`. Commands catch `TransweaveError` at the top level and format output accordingly, with exit codes: 0=success, 1=general error, 2=partial failure, 3=auth failure.

**Alternatives considered**:
- Keep plain `Error` with message parsing — brittle, can't distinguish error types programmatically.

### 3. Pull endpoint: standardize on POST /export

**Decision**: Use `POST /api/project/export/:projectId` exclusively. It accepts `format`, `languages`, `scope`, `modules`, `prettify` in the body — more flexible than the GET `/download` endpoint. Remove the fallback logic entirely.

**Alternatives considered**:
- Keep GET `/download` as primary — it's simpler but lacks module filtering and prettify options that we want for `--module` support.

### 4. Interactive prompts: @clack/prompts

**Decision**: Use `@clack/prompts` for interactive mode. It's lightweight (~15KB), has beautiful terminal UI, supports text input, select, confirm, and spinner. Import dynamically so it's not loaded in CI (flag-only) paths.

**Alternatives considered**:
- `inquirer` — much heavier (~80+ deps), overkill for our needs.
- `prompts` — good but less polished UI.
- Build our own with readline — too much work for diminishing returns.

### 5. Output formatting: shared formatter module

**Decision**: Create a `formatter.ts` module that all commands use. It checks a global `--json` / `--quiet` flag (set on the root Commander program) and routes output through `formatter.log()`, `formatter.table()`, `formatter.json()`, `formatter.progress()`. In JSON mode, collect output and print a single JSON object at the end. In quiet mode, suppress info-level messages.

**Alternatives considered**:
- Each command handles its own formatting — leads to inconsistency, which is the current problem.

### 6. Command structure: shared middleware pattern

**Decision**: Use Commander's `.hook('preAction', ...)` to run shared pre-checks. Create `withAuth(command)` and `withProject(command)` wrappers that load config and attach `apiKey`, `server`, `client`, and `projectConfig` to the command's context before the action runs.

```
program.parse()
  → preAction hook: load global config
    → withAuth: ensure apiKey exists
      → withProject: ensure .transweave.json exists, load project
        → action: command-specific logic
```

**Alternatives considered**:
- Keep inline checks — works but violates DRY and makes error handling inconsistent.

## Risks / Trade-offs

- **[Risk] `@clack/prompts` in non-TTY environments** → Dynamic import; skip prompts if `!process.stdin.isTTY`, fall back to flag-required behavior with clear error message.
- **[Risk] POST `/export` returns ZIP even for single file** → Keep existing unzip logic, it's already implemented and works.
- **[Risk] Adding 4 new commands increases surface area** → Each command is small and self-contained; the shared middleware pattern keeps them consistent.
- **[Trade-off] No local cache means `diff` requires a server round-trip** → Acceptable for now; cache adds complexity and staleness concerns.
- **[Trade-off] `--json` output delays all output to end of command** → Necessary for valid JSON; use spinner in TTY mode so users know it's working.
