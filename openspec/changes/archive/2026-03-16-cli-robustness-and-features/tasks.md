## 1. Error Classes & API Client Rewrite

- [x] 1.1 Create `src/errors.ts` with TransweaveError base class and subclasses (AuthError, NotFoundError, NetworkError, ServerError) — each with statusCode, endpoint, hint
- [x] 1.2 Rewrite `src/api-client.ts`: add AbortController timeout (30s default, 120s for getRaw), retry logic (2 retries, exponential backoff, skip 4xx), generic type parameter on get/post/getRaw
- [x] 1.3 Update API client error handling to throw structured error classes based on HTTP status codes

## 2. Shared Utilities & Formatter

- [x] 2.1 Create `src/guards.ts` with `ensureAuth()` and `ensureProject()` — return typed config objects or throw structured errors
- [x] 2.2 Create `src/formatter.ts` with output mode support (normal/json/quiet): `log()`, `table()`, `json()`, `error()`, `progress()` methods
- [x] 2.3 Add `--json` and `--quiet` global options to root Commander program in `src/index.ts`, wire formatter mode

## 3. Refactor Existing Commands

- [x] 3.1 Refactor `login` command: use ensureAuth pattern for validation, use formatter for output, define exit codes
- [x] 3.2 Refactor `init` command: use guards, formatter, remove inline error checks
- [x] 3.3 Refactor `pull` command: switch to POST `/api/project/export` exclusively (remove download/export fallback), use guards/formatter, add `--module` option
- [x] 3.4 Refactor `push` command: use guards/formatter, add `--dry-run` via import/preview endpoint, implement exit code 2 for partial failures

## 4. Interactive Mode

- [x] 4.1 Add `@clack/prompts` dependency to packages/cli
- [x] 4.2 Add interactive login flow: prompt for server URL and API key when flags are omitted and stdin is TTY
- [x] 4.3 Add interactive init flow: fetch projects via `GET /api/project/all`, present selection list, prompt for output dir and format

## 5. New Commands

- [x] 5.1 Create `src/commands/whoami.ts`: call `GET /api/auth/status`, display user info + server + project config if present
- [x] 5.2 Create `src/commands/status.ts`: call `GET /api/tokens/:projectId/progress`, render progress table with bars, implement `--fail-under` threshold check
- [x] 5.3 Create `src/commands/diff.ts`: read local files, call `POST /api/project/import/preview/:projectId`, display added/modified/removed per language
- [x] 5.4 Create `src/commands/search.ts`: call `GET /api/tokens/:projectId/search` with query/module/status/tags params, render results table with pagination info

## 6. Register & Integration

- [x] 6.1 Register all new commands (whoami, status, diff, search) in `src/index.ts`
- [x] 6.2 Add top-level error handler in `src/index.ts`: catch TransweaveError, format with formatter, exit with semantic code
- [x] 6.3 Verify all commands work in both flag mode and interactive mode, test JSON output
