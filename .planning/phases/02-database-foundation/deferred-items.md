# Deferred Items - Phase 02

## Pre-existing TypeScript Errors

1. **src/jwt/strategy.ts:8** - `process.env.JWT_SECRET` is `string | undefined` but `secretOrKey` requires `string | Buffer`. Pre-existing since Phase 01 cleanup. Not in scope for database foundation work.
