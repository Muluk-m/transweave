# Phase 2: Database Foundation - Research

**Researched:** 2026-03-01
**Domain:** Drizzle ORM with PGlite/PostgreSQL, repository pattern, MongoDB schema migration
**Confidence:** HIGH

## Summary

Phase 2 replaces the entire MongoDB/Mongoose data layer with Drizzle ORM using PostgreSQL-dialect schemas shared between PGlite (development/quick-start) and PostgreSQL (production). The codebase has 6 Mongoose schemas (User, Team, Membership, Project, Token, ActivityLog) with an embedded sub-document (TokenHistory) that becomes a 7th table. Services currently inject Mongoose models directly via `@InjectModel` and use MongoDB-specific patterns: `.populate()` chains, `.aggregate()` pipelines, `Schema.Types.Mixed` for JSONB-like fields, and `session.withTransaction()` for transactional operations.

The key architectural insight is that PGlite and PostgreSQL both use Drizzle's `pgTable` schema definitions, meaning one schema file serves both environments. The only difference is the connection layer: `drizzle-orm/pglite` vs `drizzle-orm/postgres-js`. This eliminates the dual-schema problem that would arise with SQLite.

**Primary recommendation:** Build the Drizzle schema, DrizzleModule with conditional provider, and repository layer as a self-contained foundation. Do NOT touch services in this phase -- services continue using Mongoose until Phase 3 migrates them. This phase delivers the new data layer alongside the old one, verified via integration tests.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DB-01 | All data models migrated from Mongoose/MongoDB to Drizzle ORM with PostgreSQL schema | Drizzle `pgTable` schema definitions for all 7 entities; JSONB columns for Mixed types; embedded TokenHistory normalized to separate table |
| DB-02 | PGlite works as zero-config development/quick-start database | PGlite 0.3.x with `drizzle-orm/pglite` driver; file-based persistence at `./data/pglite/`; same `pgTable` schema as PostgreSQL |
| DB-03 | PostgreSQL works as production database | `postgres` (postgres.js) 3.4.x driver with `drizzle-orm/postgres-js`; PostgreSQL 17 in Docker |
| DB-04 | Database driver selected automatically based on DATABASE_URL environment variable | Conditional provider pattern: if DATABASE_URL starts with `postgres://` use postgres.js driver, else use PGlite |
| DB-05 | Database migrations managed via drizzle-kit | drizzle-kit 0.31.x generates SQL migrations from schema diffs; `drizzle-orm/migrator` applies migrations at startup |
| DB-06 | Repository abstraction layer isolates all database operations from service logic | Repository classes inject DRIZZLE token; services will inject repositories (in Phase 3); all Drizzle imports confined to `db/` and `repository/` directories |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | 0.45.x (latest: 0.45.1) | TypeScript ORM | Fastest NestJS ORM, 7kb bundle, TypeScript-first, SQL-transparent, first-class PGlite support via same `pgTable` dialect |
| drizzle-kit | 0.31.x (latest: 0.31.9) | Migration tooling | Companion CLI for drizzle-orm; generates SQL migrations from schema diffs, provides `drizzle-kit studio` for DB browsing |
| @electric-sql/pglite | 0.3.x (latest: 0.3.15) | Embedded PostgreSQL | WASM PostgreSQL (~3MB), zero Docker requirement, file-based persistence, shares exact `pgTable` schema with production |
| postgres (postgres.js) | 3.4.x (latest: 3.4.8) | PostgreSQL driver | Fastest Node.js PostgreSQL driver, native ESM, preferred over legacy `pg` for new projects |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| dotenv | 16.5.0 | Env var loading | Already installed; load DATABASE_URL at startup |
| uuid | 11.1.0 | UUID generation | Already installed; generate UUIDs if needed in application code (Drizzle uses `gen_random_uuid()` in PostgreSQL) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| postgres.js | pg (node-postgres) | pg is legacy, callback-based; postgres.js is faster and modern ESM. Both work with Drizzle. |
| PGlite | SQLite (better-sqlite3) | SQLite requires separate `sqliteTable` schema in Drizzle, creating dual-schema maintenance. PGlite avoids this entirely. |
| Custom DrizzleModule | @knaadh/nestjs-drizzle-pg | Community module adds dependency; custom module is ~30 lines and gives full control over PGlite/PostgreSQL switching. |

**Installation:**
```bash
# Database layer (server package)
pnpm --filter server add drizzle-orm @electric-sql/pglite postgres

# Database dev tooling (server package)
pnpm --filter server add -D drizzle-kit
```

## Architecture Patterns

### Recommended Project Structure
```
packages/server/src/
├── db/                           # NEW: Database abstraction layer
│   ├── schema/                   # Drizzle schema definitions
│   │   ├── users.ts              # pgTable definition for users
│   │   ├── teams.ts              # pgTable definition for teams
│   │   ├── memberships.ts        # pgTable definition for memberships
│   │   ├── projects.ts           # pgTable definition for projects
│   │   ├── tokens.ts             # pgTable definition for tokens
│   │   ├── token-history.ts      # pgTable definition for token_history (normalized from embedded)
│   │   ├── activity-logs.ts      # pgTable definition for activity_logs
│   │   ├── relations.ts          # Drizzle relations for query API
│   │   └── index.ts              # Re-exports all schemas + relations
│   ├── migrations/               # Auto-generated by drizzle-kit
│   ├── drizzle.module.ts         # NestJS @Global() module providing DRIZZLE token
│   ├── drizzle.provider.ts       # Factory creating PGlite or PostgreSQL Drizzle instance
│   └── drizzle.types.ts          # Shared DB type definition
├── repository/                   # NEW: Repository layer
│   ├── base.repository.ts        # Generic CRUD base class
│   ├── user.repository.ts        # User-specific queries
│   ├── team.repository.ts        # Team-specific queries
│   ├── membership.repository.ts  # Membership queries (joins users/teams)
│   ├── project.repository.ts     # Project queries
│   ├── token.repository.ts       # Token queries (JSONB translations)
│   ├── token-history.repository.ts # Token history queries
│   └── activity-log.repository.ts  # Activity log queries (replaces aggregation pipelines)
├── service/                      # EXISTING: unchanged in this phase
├── controller/                   # EXISTING: unchanged in this phase
└── models/                       # EXISTING: kept during this phase, removed in Phase 3
```

### Pattern 1: Drizzle Schema Definition with JSONB

**What:** Define PostgreSQL tables using Drizzle's `pgTable` with proper types including `jsonb` for flexible fields.
**When to use:** For every entity that maps from a Mongoose schema.

```typescript
// Source: https://orm.drizzle.team/docs/column-types/pg
import { pgTable, uuid, text, timestamp, jsonb, varchar, index } from 'drizzle-orm/pg-core';

export const tokens = pgTable('tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull(),
  module: text('module'),
  translations: jsonb('translations').notNull().$type<Record<string, string>>(),
  tags: jsonb('tags').$type<string[]>().default([]),
  comment: text('comment'),
  screenshots: jsonb('screenshots').$type<string[]>().default([]),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('tokens_project_id_idx').on(table.projectId),
  index('tokens_key_idx').on(table.key),
]);
```

### Pattern 2: Conditional Database Provider

**What:** A NestJS provider that creates either PGlite or PostgreSQL Drizzle instance based on `DATABASE_URL` env var.
**When to use:** At application bootstrap. Decided once, used for lifetime of process.

```typescript
// Source: https://orm.drizzle.team/docs/connect-pglite + https://orm.drizzle.team/docs/get-started/postgresql-new
import { Provider } from '@nestjs/common';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import { PGlite } from '@electric-sql/pglite';
import postgres from 'postgres';
import * as schema from './schema';

export const DRIZZLE = 'DRIZZLE';

export const DrizzleProvider: Provider = {
  provide: DRIZZLE,
  useFactory: () => {
    const databaseUrl = process.env.DATABASE_URL;

    if (databaseUrl?.startsWith('postgres://') || databaseUrl?.startsWith('postgresql://')) {
      const client = postgres(databaseUrl);
      return drizzlePostgres(client, { schema });
    }

    // Default: PGlite for zero-config dev/quick-start
    const dataDir = process.env.PGLITE_DATA_DIR || './data/pglite';
    const client = new PGlite(dataDir);
    return drizzlePglite(client, { schema });
  },
};
```

### Pattern 3: Repository with Drizzle Injection

**What:** Repository classes receive the Drizzle instance via NestJS DI and encapsulate all query logic.
**When to use:** For every entity. Services never import Drizzle directly.

```typescript
// Source: https://medium.com/@vimulatus/repository-pattern-in-nest-js-with-drizzle-orm-e848aa75ecae
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/drizzle.provider';
import { users } from '../db/schema';
import type { DrizzleDB } from '../db/drizzle.types';

@Injectable()
export class UserRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findById(id: string) {
    const results = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return results[0] ?? null;
  }

  async findByEmail(email: string) {
    const results = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return results[0] ?? null;
  }

  async create(data: typeof users.$inferInsert) {
    const [result] = await this.db.insert(users).values(data).returning();
    return result;
  }

  async update(id: string, data: Partial<typeof users.$inferInsert>) {
    const [result] = await this.db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result;
  }

  async delete(id: string) {
    await this.db.delete(users).where(eq(users.id, id));
  }
}
```

### Pattern 4: Drizzle Module (Global)

**What:** A NestJS module that provides the DRIZZLE token globally and exports repositories.

```typescript
import { Global, Module } from '@nestjs/common';
import { DrizzleProvider, DRIZZLE } from './drizzle.provider';
import { UserRepository } from '../repository/user.repository';
import { TeamRepository } from '../repository/team.repository';
// ... other repositories

@Global()
@Module({
  providers: [
    DrizzleProvider,
    UserRepository,
    TeamRepository,
    MembershipRepository,
    ProjectRepository,
    TokenRepository,
    TokenHistoryRepository,
    ActivityLogRepository,
  ],
  exports: [
    DRIZZLE,
    UserRepository,
    TeamRepository,
    MembershipRepository,
    ProjectRepository,
    TokenRepository,
    TokenHistoryRepository,
    ActivityLogRepository,
  ],
})
export class DrizzleModule {}
```

### Pattern 5: Drizzle Transactions

**What:** Replace Mongoose `session.withTransaction()` with Drizzle's `db.transaction()`.
**When to use:** Wherever the current code uses `startSession()` + `withTransaction()`.

```typescript
// Source: https://orm.drizzle.team/docs/transactions (Drizzle official docs)
// Current Mongoose pattern:
//   const session = await this.mongooseService.getConnection().startSession();
//   await session.withTransaction(async () => { ... });

// New Drizzle pattern:
async createTeamWithOwner(teamData: NewTeam, userId: string) {
  return this.db.transaction(async (tx) => {
    const [team] = await tx.insert(teams).values(teamData).returning();
    await tx.insert(memberships).values({
      userId,
      teamId: team.id,
      role: 'owner',
    });
    return team;
  });
}
```

### Pattern 6: Migration Strategy

**What:** Use drizzle-kit to generate SQL migration files, apply via migrator at server startup.
**When to use:** Every time schema changes.

```typescript
// drizzle.config.ts (project root of server package)
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'pglite://./data/pglite',
  },
});
```

```bash
# Generate migration after schema change
npx drizzle-kit generate

# Apply migration (dev)
npx drizzle-kit migrate

# Or push schema directly (prototyping)
npx drizzle-kit push
```

### Anti-Patterns to Avoid

- **Leaking Drizzle into services:** All `eq()`, `and()`, `sql` imports MUST stay in repository files. Services call repository methods with plain TypeScript arguments.
- **Running migrations at application startup in production:** Use a separate migration step (Docker entrypoint or init script). In development, running migrations in `onModuleInit` is acceptable.
- **Eager JOIN everything (Mongoose populate habit):** Don't replicate `.populate()` chains as massive JOINs. Load only what each endpoint needs. Use separate queries where appropriate.
- **Using raw SQL:** Stay within Drizzle's query builder for all operations. Raw SQL breaks the type safety that makes the repository pattern valuable.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Migration generation | Custom SQL diff scripts | `drizzle-kit generate` | Drizzle-kit diffs schema TS files against current DB state; handles column renames, type changes, index creation |
| Connection pooling | Custom pool manager | postgres.js built-in pooling | postgres.js handles connection pooling internally; PGlite is single-connection |
| UUID generation | Custom ID generators | PostgreSQL `gen_random_uuid()` via `defaultRandom()` | Database-native UUID generation is atomic and conflict-free |
| JSON validation | Runtime JSONB shape checking | TypeScript `$type<T>()` on jsonb columns | Drizzle's `$type<T>()` provides compile-time type safety for JSONB columns |
| DB browser | Custom admin UI | `drizzle-kit studio` | Built-in GUI at `https://local.drizzle.studio` for browsing data |

**Key insight:** Drizzle-kit is the critical tool that eliminates hand-rolled migration scripts. Every schema change in TypeScript auto-generates a SQL migration file. Do not write migration SQL manually.

## Common Pitfalls

### Pitfall 1: MongoDB Mixed Types to JSONB
**What goes wrong:** Token `translations` field is `Schema.Types.Mixed` (any shape). Attempting to normalize into separate tables creates JOIN explosion for every language. Dumping to TEXT loses queryability.
**Why it happens:** MongoDB's schemaless nature allows storing arbitrary objects. PostgreSQL demands structure.
**How to avoid:** Use PostgreSQL `jsonb` columns with Drizzle's `$type<T>()` for compile-time safety. Structure: `translations: jsonb('translations').$type<Record<string, string>>()`. This preserves the key-value structure (language code -> translation value) while enabling JSONB operators for querying.
**Warning signs:** If you find yourself creating a `translation_values` table with a row per language per token, stop. That's over-normalization for this use case.

### Pitfall 2: Embedded Documents Must Be Normalized
**What goes wrong:** Token has embedded `history: TokenHistory[]` array. MongoDB stores this as a nested array inside the token document. PostgreSQL cannot do this efficiently.
**Why it happens:** MongoDB encourages denormalization; relational databases require normalization for variable-length nested data.
**How to avoid:** Create a separate `token_history` table with a foreign key to `tokens`. This is the standard relational pattern for what MongoDB does with embedded arrays.
**Warning signs:** If a schema has a JSONB array that will grow unboundedly and needs to be queried/paginated independently, normalize it to a table.

### Pitfall 3: ObjectId to UUID Mapping
**What goes wrong:** All Mongoose schemas use `Schema.Types.ObjectId` for `_id` and references. PostgreSQL uses UUID. The `_id` -> `id` virtual mapping in base.schema.ts hides this, but every foreign key reference changes format.
**Why it happens:** MongoDB ObjectIds are 12-byte hex strings; PostgreSQL UUIDs are 128-bit RFC 4122 values.
**How to avoid:** Use `uuid('id').primaryKey().defaultRandom()` for all primary keys. Use `uuid('user_id').references(() => users.id)` for foreign keys. The UUID format change is clean because the API already uses string IDs (the virtual `id` field).
**Warning signs:** If you see code parsing ObjectId hex strings or using `Types.ObjectId()` constructor, those must all be replaced with plain string UUIDs.

### Pitfall 4: Mongoose .populate() Has No Direct Equivalent
**What goes wrong:** Current code uses `.populate()` chains extensively (18 occurrences across 4 services). Developers try to replicate this with Drizzle's relational query API or massive JOIN queries.
**Why it happens:** `.populate()` is a convenience API that auto-resolves references. SQL requires explicit JOINs or separate queries.
**How to avoid:** In repository methods, use Drizzle's query builder with explicit JOINs where needed. For simple cases (e.g., membership -> user name), use `leftJoin`. For complex cases (e.g., team -> memberships -> users), consider separate queries to avoid cartesian products.
**Warning signs:** If a single query JOINs more than 3 tables, consider breaking it into separate queries.

### Pitfall 5: Aggregate Pipelines to SQL
**What goes wrong:** `activity-log.service.ts` has 2 MongoDB aggregate pipelines (`$match`, `$group`, `$project`, `$dateToString`). These need SQL equivalents.
**Why it happens:** MongoDB aggregation framework uses a pipeline syntax that has no direct SQL mapping.
**How to avoid:** Rewrite as SQL `GROUP BY` queries. Example: `$group by type with count` becomes `SELECT type, COUNT(*) FROM activity_logs WHERE ... GROUP BY type`. The `$dateToString` pipeline becomes `DATE_TRUNC('day', created_at)` in PostgreSQL.
**Warning signs:** If aggregate logic gets complex, consider creating repository methods for each aggregate, keeping the SQL isolated.

### Pitfall 6: Map Type to JSONB
**What goes wrong:** Project schema uses `Map<string, string>` for `languageLabels`. The `base.schema.ts` has special handling to convert Maps to plain objects in `toJSON`/`toObject`.
**Why it happens:** JavaScript Maps don't serialize to JSON directly. Mongoose handles this conversion.
**How to avoid:** Use `jsonb` column with `$type<Record<string, string>>()`. Drizzle handles JSON serialization automatically. No special conversion needed.
**Warning signs:** If you see `Object.fromEntries()` or `Map` constructors in serialization code, those can be removed.

### Pitfall 7: PGlite Transaction Support
**What goes wrong:** PGlite supports transactions but has some differences from full PostgreSQL (e.g., no savepoints in older versions, single-connection so no concurrent transaction issues).
**Why it happens:** PGlite is an embedded single-process database.
**How to avoid:** Use Drizzle's `db.transaction()` API which abstracts the differences. Do not use raw `BEGIN`/`COMMIT` statements. Test transactions on both PGlite and PostgreSQL.
**Warning signs:** If a test passes on PGlite but fails on PostgreSQL (or vice versa), the transaction pattern may be using a database-specific feature.

## Code Examples

Verified patterns from official sources:

### Schema Definition - Complete Token Table
```typescript
// Source: https://orm.drizzle.team/docs/column-types/pg
import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { projects } from './projects';

export const tokens = pgTable('tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull(),
  module: text('module'),
  translations: jsonb('translations').notNull().$type<Record<string, string>>(),
  tags: jsonb('tags').$type<string[]>().default([]),
  comment: text('comment'),
  screenshots: jsonb('screenshots').$type<string[]>().default([]),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('tokens_project_id_idx').on(table.projectId),
  index('tokens_key_idx').on(table.key),
]);

// Type inference
export type Token = typeof tokens.$inferSelect;
export type NewToken = typeof tokens.$inferInsert;
```

### Drizzle Relations
```typescript
// Source: https://orm.drizzle.team/docs/relations
import { relations } from 'drizzle-orm';
import { users } from './users';
import { memberships } from './memberships';
import { tokens } from './tokens';
import { tokenHistory } from './token-history';

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
}));

export const tokensRelations = relations(tokens, ({ one, many }) => ({
  project: one(projects, {
    fields: [tokens.projectId],
    references: [projects.id],
  }),
  history: many(tokenHistory),
}));
```

### PGlite Connection with File Persistence
```typescript
// Source: https://orm.drizzle.team/docs/connect-pglite
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from './schema';

const client = new PGlite('./data/pglite');  // persists to filesystem
const db = drizzle(client, { schema });
```

### PostgreSQL Connection with postgres.js
```typescript
// Source: https://orm.drizzle.team/docs/get-started/postgresql-new
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });
```

### Migration Application at Startup
```typescript
// Source: https://orm.drizzle.team/docs/connect-pglite (migrator section)
import { migrate } from 'drizzle-orm/pglite/migrator';
// or for postgres-js:
// import { migrate } from 'drizzle-orm/postgres-js/migrator';

// Apply migrations
await migrate(db, { migrationsFolder: './src/db/migrations' });
```

### JSONB Query Example
```typescript
// Querying JSONB translations field
import { sql } from 'drizzle-orm';

// Find tokens missing a specific language translation
const untranslated = await db
  .select()
  .from(tokens)
  .where(
    sql`${tokens.translations}->>${sql.raw(`'${languageCode}'`)} IS NULL`
  );
```

### Replacing MongoDB Aggregate with SQL
```typescript
// Current MongoDB aggregate (activity-log.service.ts):
//   { $match: { userId } },
//   { $group: { _id: '$type', count: { $sum: 1 } } }

// Drizzle equivalent:
import { eq, count, sql } from 'drizzle-orm';

async getUserActivityStats(userId: string) {
  return this.db
    .select({
      type: activityLogs.type,
      count: count(),
    })
    .from(activityLogs)
    .where(eq(activityLogs.userId, userId))
    .groupBy(activityLogs.type);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Mongoose ODM with MongoDB | Drizzle ORM with PostgreSQL | Project decision 2026-03 | Entire data layer changes; enables PGlite for zero-config dev |
| `Schema.Types.Mixed` for flexible fields | PostgreSQL `jsonb` with typed `$type<T>()` | Drizzle 0.30+ | Type-safe JSONB with compile-time checking |
| Embedded sub-documents | Normalized tables with foreign keys | Standard relational practice | TokenHistory becomes own table |
| ObjectId primary keys | UUID primary keys via `defaultRandom()` | PostgreSQL native | API already uses string IDs, so minimal frontend impact |
| `.populate()` for references | Explicit JOINs or relational query API | SQL standard | More control over what data is loaded |
| MongoDB aggregate pipelines | SQL GROUP BY / COUNT / DATE_TRUNC | SQL standard | Same functionality, different syntax |

**Deprecated/outdated:**
- `@nestjs/mongoose` and `mongoose` packages: Will be removed after Phase 3 migration
- `@prisma/client`: Already unused dead dependency, remove immediately
- `base.schema.ts` with virtual `id` and Map conversion: No longer needed with Drizzle's native types

## Open Questions

1. **drizzle-kit migration with PGlite connection string**
   - What we know: `drizzle-kit generate` works with any PostgreSQL-dialect config. PGlite connections can use `pglite://./data/pglite` format or require a running PGlite instance.
   - What's unclear: Whether `drizzle-kit push` works directly against a PGlite data directory or requires a running instance.
   - Recommendation: Use `drizzle-kit generate` to create SQL migration files, then apply them programmatically via `migrate()` function at startup. This is more reliable than `push` for both environments. Validate during implementation.

2. **PGlite + Drizzle `migrate()` function compatibility**
   - What we know: Drizzle exports `migrate` from `drizzle-orm/pglite/migrator`. PGlite docs confirm ORM support for Drizzle.
   - What's unclear: Edge cases with complex migrations (column renames, type changes) on PGlite vs PostgreSQL.
   - Recommendation: Start with simple schema, generate migration, test on both backends. Flag any migration that works on one but not the other.

3. **Drizzle DB type unification**
   - What we know: `drizzle-orm/pglite` returns `PgliteDatabase<T>` while `drizzle-orm/postgres-js` returns `PostgresJsDatabase<T>`. These are different types.
   - What's unclear: Whether a single `DrizzleDB` type alias can cover both, or if repositories need a union type.
   - Recommendation: Define `DrizzleDB` as a union type or use the common base type. Test that repository methods compile against both. This is a known pattern in the Drizzle community.

## Sources

### Primary (HIGH confidence)
- [Drizzle ORM - PGlite Connection](https://orm.drizzle.team/docs/connect-pglite) - PGlite setup, configuration, migration
- [Drizzle ORM - Get Started PostgreSQL](https://orm.drizzle.team/docs/get-started/postgresql-new) - postgres.js driver setup
- [Drizzle ORM - Insert](https://orm.drizzle.team/docs/insert) - `.returning()` pattern verified
- [Drizzle ORM - PostgreSQL Column Types](https://orm.drizzle.team/docs/column-types/pg) - `uuid`, `jsonb`, `timestamp` types
- [PGlite ORM Support](https://pglite.dev/docs/orm-support) - Drizzle integration confirmation

### Secondary (MEDIUM confidence)
- [Trilon - NestJS & DrizzleORM](https://trilon.io/blog/nestjs-drizzleorm-a-great-match) - NestJS integration patterns from official consulting partner
- [Repository Pattern in NestJS with Drizzle ORM](https://medium.com/@vimulatus/repository-pattern-in-nest-js-with-drizzle-orm-e848aa75ecae) - Repository pattern implementation
- [How to integrate Drizzle ORM with NestJS](https://dev.to/anooop102910/how-to-integrate-drizzle-orm-with-nest-js-gdc) - Provider pattern

### Tertiary (LOW confidence)
- [nestjs-drizzle GitHub](https://github.com/knaadh/nestjs-drizzle) - Community NestJS module (decided against using, but useful reference)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All library versions verified via npm registry and official docs. Drizzle+PGlite integration is first-class and documented.
- Architecture: HIGH - Repository pattern with NestJS DI is well-established. Conditional provider pattern is straightforward. Schema mapping from Mongoose is deterministic (6 schemas inspected, all fields accounted for).
- Pitfalls: HIGH - Based on direct codebase inspection: 18 `.populate()` calls, 2 `.aggregate()` pipelines, 8 `withTransaction()` usages, 3 `Schema.Types.Mixed` fields identified. Each has a clear Drizzle equivalent.

**Research date:** 2026-03-01
**Valid until:** 2026-03-31 (stable libraries, no fast-moving changes expected)
