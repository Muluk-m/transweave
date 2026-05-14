# CLI Architecture

Commander-based CLI for syncing translations between local repos and a Transweave server.

## Layout

```
src/
  index.ts         Commander entry, command registration
  api-client.ts    HTTP client to Transweave server (uses API key auth)
  config.ts        Per-project config file (.transweave.json) + global auth state
  formatter.ts     Output rendering (tables, diffs, JSON)
  guards.ts        Auth / config preconditions
  errors.ts        Typed CLI errors with friendly messages
  commands/
    init.ts        Bootstrap config in a project
    login.ts       Store API key in user-scope config
    whoami.ts      Show current login
    pull.ts        Server → local
    push.ts        Local → server
    diff.ts        Show pending changes between local and server
    status.ts      Summarize sync state
    search.ts      Search keys/translations from the CLI
    translate.ts   Trigger AI translation on the server
```

## Auth

API keys are minted in the web UI (Settings → API Keys) and stored locally via `login`. Every command goes through `api-client.ts` with the stored key.

## Dev

- Run during development: `pnpm dev:cli -- <command>` (from repo root) or `pnpm --filter @transweave/cli dev -- <command>`
- Build: `pnpm build:cli`

## Adding a command

1. Create `src/commands/<name>.ts` exporting a function that registers itself on the Commander program
2. Wire it in `src/index.ts`
3. Use `guards.ts` for auth/config checks; surface errors as `errors.ts` types
4. Use `formatter.ts` for output — never `console.log` raw objects
