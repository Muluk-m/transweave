## Why

The CLI (`packages/cli`) works end-to-end but is fragile: no request timeouts, no retries, untyped API responses, duplicated error handling, and a brittle double-fallback in `pull`. It also lacks commonly expected capabilities (status, diff, whoami) and forces users to memorize flags instead of offering interactive prompts. These gaps hurt developer experience and block CI/CD adoption.

## What Changes

- **API Client rewrite** — add timeout (AbortController), retry with exponential backoff for transient errors, typed responses, and structured error classes (`AuthError`, `NotFoundError`, `NetworkError`, `ServerError`).
- **Unified error handling** — extract `ensureAuth()` / `ensureProject()` helpers; remove duplicated guard logic from every command.
- **Fix pull dual-path** — remove the try/catch fallback between `/download` and `/export`; standardize on a single endpoint.
- **New commands** — `status` (translation progress per language), `diff` (preview local-vs-remote changes before push), `whoami` (current user & project info), `search` (search tokens by key/value).
- **Interactive mode** — when flags are omitted, `login` and `init` prompt interactively using `@clack/prompts`. Flags still work for CI.
- **Output modes** — `--json` for structured output, `--quiet` for minimal output, semantic exit codes (0=success, 1=error, 2=partial failure, 3=auth failure).
- **`--dry-run` for push** — leverage `POST /api/project/import/preview` to show what would change without writing.
- **`--module` filter for pull** — pull translations scoped to a specific module.
- **`--fail-under <n>` for status** — exit non-zero if overall translation coverage is below threshold (CI quality gate).

## Capabilities

### New Capabilities

- `cli-api-client`: Robust API client with timeout, retry, typed responses, and structured errors.
- `cli-error-handling`: Unified auth/project guards, structured error classes, semantic exit codes.
- `cli-interactive`: Interactive prompts for `login` and `init` when flags are omitted; project selection list for `init`.
- `cli-status-command`: `transweave status` showing per-language progress bars and optional `--fail-under` threshold.
- `cli-diff-command`: `transweave diff` previewing local-vs-remote changes using import/preview API.
- `cli-whoami-command`: `transweave whoami` displaying current user, server, and project info.
- `cli-search-command`: `transweave search` querying tokens by keyword, module, status, and tags.
- `cli-output-modes`: `--json` and `--quiet` flags across all commands for CI/scripting.
- `cli-push-enhancements`: `--dry-run` flag and unified pull endpoint (remove download/export fallback).

### Modified Capabilities

_(none — no existing specs are affected)_

## Impact

- **Code**: `packages/cli/src/` — full rewrite of `api-client.ts`, refactor all 4 existing commands, add 4 new command files, add shared utilities.
- **Dependencies**: add `@clack/prompts` for interactive mode. No other new runtime dependencies.
- **APIs consumed**: no server-side changes required; all endpoints already exist (`/progress`, `/search`, `/import/preview`, `/auth/status`, `/project/all`).
- **Breaking**: none — existing flag-based usage continues to work unchanged.
