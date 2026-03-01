# Phase 5: Translation Core & Search - Research

**Researched:** 2026-03-01
**Domain:** Translation token CRUD, search/filter, history tracking, progress metrics, bulk operations
**Confidence:** HIGH

## Summary

Phase 5 is about migrating the existing translation token management from Mongoose/MongoDB to the new Drizzle/PostgreSQL foundation (built in Phases 2-4) and enhancing it with missing features: per-language completion tracking, full-text search across keys and values, filtering by completion status or module, comments on tokens, and expanded bulk operations (delete, status change, tag). The good news is that the vast majority of this functionality already exists in the current codebase -- this phase is primarily a migration and enhancement, not a greenfield build.

The current implementation lives entirely in `ProjectService` (no dedicated token service/controller), uses Mongoose `@InjectModel` directly, embeds `TokenHistory` as a subdocument array inside the Token document, and stores translations as `Schema.Types.Mixed` (a schemaless JSON blob). The frontend already has client-side search across keys and values, module filtering, tag filtering, pagination, batch module assignment, batch delete, and batch AI translation. What's missing on the backend: dedicated search/filter API endpoints (currently all tokens are loaded client-side and filtered in the browser), per-language completion percentage computation, a comments model, and bulk tag/status change operations.

**Primary recommendation:** Extract token operations into a dedicated `TokenService` and `TokenController` using the repository pattern from Phase 2. Normalize `TokenHistory` into its own table with a foreign key to tokens. Store `translations` as a JSONB column for queryability. Implement server-side search and filtering to support large projects (1000+ tokens). Add per-language progress as a computed query. Keep the frontend largely intact but connect it to new API endpoints.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TRANS-01 | User can create translation tokens with multi-language values | Already exists in `ProjectService.createToken()` -- migrate to repository pattern, dedicated TokenService |
| TRANS-02 | User can edit translation token keys and values | Already exists in `ProjectService.updateToken()` -- migrate to repository pattern with merge semantics |
| TRANS-03 | User can delete translation tokens | Already exists in `ProjectService.deleteToken()` -- migrate, ensure cascade cleanup |
| TRANS-04 | User can organize tokens by modules/namespaces | Already exists via `token.module` field + `Project.modules[]` -- migrate module field to DB column |
| TRANS-05 | User can view token change history | Already exists as embedded `TokenHistory[]` subdocument -- normalize to separate `token_history` table |
| TRANS-06 | Translation progress shown as per-language completion percentage per project | Overview tab has aggregate completion. Need per-language breakdown via SQL query on JSONB translations |
| TRANS-07 | User can add comments/notes on individual translation tokens | `token.comment` field exists (single string). Enhance to support comment threads or keep as single note |
| TRANS-08 | User can bulk delete, bulk status change, and bulk tag translations | Bulk delete exists (client-side Promise.all). Bulk module exists. Need: bulk tag, bulk delete as single API call |
| SRCH-01 | User can full-text search across token keys and translation values | Client-side search exists in frontend. Need server-side search endpoint with ILIKE or pg_trgm for JSONB values |
| SRCH-02 | User can filter translations by language completion status | `filterTokensByScope()` exists in ProjectService. Migrate to SQL WHERE clause on JSONB |
| SRCH-03 | User can filter translations by module/namespace | Client-side module filter exists. Migrate to SQL WHERE clause on module column |
</phase_requirements>

## Standard Stack

### Core

No new libraries needed for this phase. All work uses the stack established in Phase 2.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Drizzle ORM | 0.45.x | Query builder, schema definitions | Already installed in Phase 2, used for all DB operations |
| PostgreSQL | 17 | JSONB storage, GIN indexes, full-text capabilities | Production database from Phase 2 |
| PGlite | 0.3.x | Development database | Dev database from Phase 2 |
| NestJS | 11.x | Service/Controller framework | Existing backend framework |
| @tanstack/react-table | (current) | Token table with selection, sorting, pagination | Already used in frontend TokenTable component |
| Zod | (current) | Request validation | Already used throughout backend services |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pg_trgm (PostgreSQL extension) | built-in | Fuzzy text search on JSONB values | If ILIKE performance is insufficient at scale (1000+ tokens). CREATE EXTENSION pg_trgm |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| JSONB translations column | Normalized translations table (token_id, language, value) | Normalized is faster for per-language queries but adds JOINs for every token read. JSONB is simpler, sufficient for i18n scale (rarely >50 languages per project). Stick with JSONB. |
| Server-side ILIKE search | PostgreSQL full-text search (tsvector/tsquery) | Full-text search is overkill for translation key/value search. ILIKE with trigram index handles the use case. |
| Single comment field | Comment thread model (separate table) | REQUIREMENTS.md says "comments/notes on individual translation tokens" -- a single text field (already exists as `token.comment`) satisfies this. A thread model adds complexity without clear user need. Keep it simple. |

## Architecture Patterns

### Recommended Project Structure

After Phase 5, the token-related code should be organized as:

```
packages/server/src/
├── controller/
│   └── token.controller.ts          # NEW: Dedicated token endpoints
├── service/
│   └── token.service.ts             # NEW: Token business logic (extracted from project.service.ts)
├── repository/
│   ├── token.repository.ts          # From Phase 2: Token CRUD operations
│   └── token-history.repository.ts  # From Phase 2: History CRUD operations
├── db/schema/
│   ├── token.ts                     # From Phase 2: Drizzle token table definition
│   └── token-history.ts             # From Phase 2: Drizzle token_history table definition

packages/web/
├── api/
│   └── project.ts                   # MODIFY: Token API functions point to new endpoints
├── components/views/projectView/
│   ├── ProjectTokensTab/
│   │   ├── index.tsx                # MODIFY: Connect to server-side search/filter
│   │   ├── TokenTable.tsx           # MODIFY: Minimal changes, add completion status column
│   │   ├── TokenFormDrawer.tsx      # KEEP: Already works well
│   │   └── BatchAddDialog.tsx       # KEEP: Already works well
│   └── ProjectOverviewTab.tsx       # MODIFY: Per-language completion from API instead of client calc
```

### Pattern 1: Dedicated Token Service (Extract from ProjectService)

**What:** Move all token-related methods out of `ProjectService` into a new `TokenService` that depends on `TokenRepository` and `TokenHistoryRepository`.

**When to use:** Now. The current `ProjectService` is 1466 lines and handles both project and token concerns. Separation improves maintainability and testability.

**Current state (what to extract):**
- `getProjectTokens()` -> `TokenService.findByProject()`
- `createToken()` -> `TokenService.create()`
- `getTokenById()` -> `TokenService.findById()`
- `updateToken()` -> `TokenService.update()`
- `deleteToken()` -> `TokenService.delete()`
- `batchUpdateTokenModule()` -> `TokenService.batchUpdateModule()`
- `filterTokensByScope()` -> `TokenService` private helper
- Import/export token methods stay in ProjectService (they're project-level operations that happen to touch tokens)

### Pattern 2: JSONB Translations with Server-Side Search

**What:** Store `translations` as a JSONB column. Search across keys and values using SQL queries instead of loading all tokens client-side.

**Why:** The current frontend loads ALL tokens for a project and filters in the browser (`filteredAndSortedTokens` useMemo). This works for small projects but fails at 1000+ tokens.

**Drizzle schema:**
```typescript
// token table
export const tokens = pgTable('tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 500 }).notNull(),
  module: varchar('module', { length: 100 }).default(''),
  translations: jsonb('translations').$type<Record<string, string>>().notNull().default({}),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  comment: text('comment').default(''),
  screenshots: jsonb('screenshots').$type<string[]>().notNull().default([]),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Indexes
export const tokenProjectIdx = index('idx_token_project').on(tokens.projectId);
export const tokenKeyIdx = index('idx_token_key').on(tokens.projectId, tokens.key);
export const tokenModuleIdx = index('idx_token_module').on(tokens.projectId, tokens.module);
```

**Search query pattern (ILIKE on JSONB):**
```typescript
// Search across key and all translation values
async searchTokens(projectId: string, query: string, filters?: TokenFilters) {
  const searchPattern = `%${query}%`;

  return db.select()
    .from(tokens)
    .where(and(
      eq(tokens.projectId, projectId),
      or(
        ilike(tokens.key, searchPattern),
        // Search within JSONB values using raw SQL
        sql`EXISTS (
          SELECT 1 FROM jsonb_each_text(${tokens.translations}) AS t(lang, val)
          WHERE t.val ILIKE ${searchPattern}
        )`
      ),
      // Module filter
      filters?.module ? eq(tokens.module, filters.module) : undefined,
      // Completion filter handled separately
    ));
}
```

### Pattern 3: Token History as Separate Table

**What:** Normalize the embedded `TokenHistory[]` array into a `token_history` table with a foreign key to `tokens`.

**Why:** MongoDB's embedded arrays are natural for document stores but problematic in relational databases: no efficient querying of history across tokens, no proper foreign keys, and JSONB arrays don't support partial updates.

```typescript
export const tokenHistory = pgTable('token_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  tokenId: uuid('token_id').notNull().references(() => tokens.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id),
  translations: jsonb('translations').$type<Record<string, string>>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const historyTokenIdx = index('idx_history_token').on(tokenHistory.tokenId);
```

### Pattern 4: Per-Language Completion Percentage

**What:** Compute completion percentage per language using a SQL query rather than loading all tokens and counting client-side.

**SQL approach:**
```sql
-- Per-language completion for a project
SELECT
  lang.key AS language,
  COUNT(*) AS total_tokens,
  COUNT(CASE WHEN translations->>lang.key IS NOT NULL
             AND translations->>lang.key != '' THEN 1 END) AS completed,
  ROUND(
    COUNT(CASE WHEN translations->>lang.key IS NOT NULL
               AND translations->>lang.key != '' THEN 1 END)::numeric
    / COUNT(*)::numeric * 100, 1
  ) AS percentage
FROM tokens,
     jsonb_array_elements_text(
       (SELECT jsonb_agg(value) FROM jsonb_each_text(
         (SELECT languages FROM projects WHERE id = $1)::jsonb
       ))
     ) AS lang(key)
WHERE tokens.project_id = $1
GROUP BY lang.key;
```

**Simpler Drizzle approach (project languages are known):**
```typescript
async getLanguageCompletion(projectId: string, languages: string[]) {
  const results: Record<string, { total: number; completed: number; percentage: number }> = {};

  for (const lang of languages) {
    const [stats] = await db.select({
      total: count(),
      completed: count(
        sql`CASE WHEN ${tokens.translations}->>${sql.raw(`'${lang}'`)} IS NOT NULL
             AND ${tokens.translations}->>${sql.raw(`'${lang}'`)} != '' THEN 1 END`
      ),
    })
    .from(tokens)
    .where(eq(tokens.projectId, projectId));

    results[lang] = {
      total: stats.total,
      completed: stats.completed,
      percentage: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
    };
  }

  return results;
}
```

### Pattern 5: Bulk Operations API

**What:** Single API endpoint for bulk operations instead of client-side Promise.all loops.

**Current problem:** `handleDeleteSelected` in the frontend does `Promise.all(selected.map(id => deleteToken(id)))` -- this fires N individual HTTP requests and N individual database deletions.

**Better approach:**
```typescript
// POST /api/tokens/bulk
@Post('bulk')
@UseGuards(AuthGuard)
async bulkOperation(
  @Body() data: {
    tokenIds: string[];
    operation: 'delete' | 'tag' | 'untag' | 'set-module';
    payload?: {
      tags?: string[];      // For tag/untag operations
      module?: string | null; // For set-module operation
    };
  },
  @CurrentUser() user: UserPayload,
) {
  // Verify all tokens belong to same project
  // Verify user has permission
  // Execute operation in single transaction
}
```

### Anti-Patterns to Avoid

- **Loading all tokens client-side for search/filter:** The current approach loads all project tokens via `getProjectTokens()` then filters in `useMemo`. This breaks at scale. Implement server-side search/filter with pagination.
- **N+1 delete pattern:** Current bulk delete sends N individual DELETE requests. Use a single bulk endpoint with `DELETE FROM tokens WHERE id = ANY($1)`.
- **Embedding history in token document:** The MongoDB pattern of embedding `TokenHistory[]` inside the token document doesn't map well to relational databases. Use a separate table.
- **Computing progress client-side:** The Overview tab currently computes completion by iterating all tokens in JavaScript. Use SQL aggregation for accuracy and performance.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSONB querying | Custom string parsing of JSON | PostgreSQL JSONB operators (`->>`, `?`, `@>`) via Drizzle `sql` template | PostgreSQL JSONB is purpose-built for this; custom parsing is slower and buggier |
| Text search in JSONB values | Loading all records and filtering in JS | `jsonb_each_text()` + ILIKE in SQL | Database does the work at the storage layer, orders of magnitude faster |
| Pagination | Custom offset calculation | Drizzle `.limit()` + `.offset()` with `COUNT(*)` for total | Standard SQL pagination, no reason to reinvent |
| Completion statistics | Client-side iteration over all tokens | SQL `COUNT` + `CASE WHEN` aggregation on JSONB | Single query vs loading entire dataset to count |

**Key insight:** The MongoDB codebase was forced to do a lot of computation client-side because MongoDB's querying capabilities for nested/mixed types are limited. PostgreSQL with JSONB eliminates this limitation -- move computation to the database.

## Common Pitfalls

### Pitfall 1: JSONB Key Injection in Search Queries

**What goes wrong:** Constructing JSONB path queries with user input can lead to SQL injection if not properly parameterized.
**Why it happens:** JSONB path operators like `->>` require string keys. Naive string interpolation creates injection vectors.
**How to avoid:** Always use Drizzle's `sql` template tag for parameterized queries. Never concatenate user input into SQL strings. Use `sql.raw()` only for known-safe values (like language codes from the project's language list).
**Warning signs:** Any `sql.raw(userInput)` or string template literals in SQL queries.

### Pitfall 2: Missing Token-Project Cascade on Delete

**What goes wrong:** Deleting a project leaves orphaned tokens in the database. Or deleting a token leaves orphaned history records.
**Why it happens:** The current code manually handles cascading (`deleteMany({ projectId })` before project delete). In the relational world, foreign keys with `ON DELETE CASCADE` handle this automatically, but only if configured correctly.
**How to avoid:** Define `references(() => projects.id, { onDelete: 'cascade' })` on `tokens.projectId`. Define `references(() => tokens.id, { onDelete: 'cascade' })` on `tokenHistory.tokenId`. Test that deleting a project cascades to tokens and history.
**Warning signs:** Manual cascade logic in service code after foreign keys are set up.

### Pitfall 3: Translation Merge Semantics Lost in Migration

**What goes wrong:** The current `updateToken` merges translations (spreads existing + new), not replaces. If the migration changes this to a full replacement, partial updates from the frontend will wipe out translations for languages not included in the update.
**Why it happens:** JSONB `SET` in PostgreSQL replaces the entire column value. The merge must be done explicitly.
**How to avoid:** In the token update method, use `jsonb_concat` or `||` operator to merge JSONB objects:
```sql
UPDATE tokens SET translations = translations || $1 WHERE id = $2
```
Or in Drizzle: `sql`${tokens.translations} || ${newTranslations}::jsonb``
**Warning signs:** Frontend sends `{ "en": "hello" }` and all other language translations disappear.

### Pitfall 4: Unique Key Constraint Scope

**What goes wrong:** Token keys must be unique within a project, not globally. A unique constraint on just `key` prevents two projects from having the same key name.
**Why it happens:** Forgetting to scope the unique constraint to `(projectId, key)`.
**How to avoid:** Create a composite unique index: `uniqueIndex('uniq_token_project_key').on(tokens.projectId, tokens.key)`. The current code checks this manually via `findOne({ projectId, key })` -- the database constraint is safer.
**Warning signs:** `BadRequestException('key already exists')` errors when creating tokens in different projects with the same key.

### Pitfall 5: Server-Side Pagination Breaking Frontend Selection State

**What goes wrong:** The frontend maintains selection state (checkboxes) in `@tanstack/react-table`. When pagination is server-side, navigating pages loses selection state because the table data changes.
**Why it happens:** The current approach loads ALL tokens client-side, so selection state persists across "pages" (which are just array slices). Moving to server-side pagination means the table only has the current page's data.
**How to avoid:** Two approaches: (1) Keep client-side pagination for the tokens tab (load all tokens for the project, paginate in the browser) -- this works fine up to ~5000 tokens. (2) If server-side pagination is needed, maintain selection state outside the table component in a `Set<string>` of selected token IDs.
**Warning signs:** Users report losing their checkbox selections when navigating pages.

## Code Examples

### Token Repository (Drizzle Pattern)

```typescript
// Based on Phase 2 repository pattern
@Injectable()
export class TokenRepository {
  constructor(@Inject('DRIZZLE') private db: DrizzleDB) {}

  async findByProject(projectId: string, options?: {
    search?: string;
    module?: string;
    completionStatus?: 'all' | 'completed' | 'incomplete';
    languages?: string[];
    offset?: number;
    limit?: number;
  }) {
    const conditions = [eq(tokens.projectId, projectId)];

    if (options?.search) {
      const pattern = `%${options.search}%`;
      conditions.push(
        or(
          ilike(tokens.key, pattern),
          sql`EXISTS (
            SELECT 1 FROM jsonb_each_text(${tokens.translations}) AS t(lang, val)
            WHERE t.val ILIKE ${pattern}
          )`
        )
      );
    }

    if (options?.module) {
      if (options.module === '__no_module__') {
        conditions.push(or(eq(tokens.module, ''), isNull(tokens.module)));
      } else {
        conditions.push(eq(tokens.module, options.module));
      }
    }

    if (options?.completionStatus === 'completed' && options?.languages) {
      // All languages must have non-empty values
      for (const lang of options.languages) {
        conditions.push(
          sql`${tokens.translations}->>${lang} IS NOT NULL AND ${tokens.translations}->>${lang} != ''`
        );
      }
    } else if (options?.completionStatus === 'incomplete' && options?.languages) {
      // At least one language missing
      const missingConditions = options.languages.map(lang =>
        sql`(${tokens.translations}->>${lang} IS NULL OR ${tokens.translations}->>${lang} = '')`
      );
      conditions.push(or(...missingConditions));
    }

    const query = this.db.select()
      .from(tokens)
      .where(and(...conditions))
      .orderBy(desc(tokens.createdAt));

    if (options?.limit) {
      query.limit(options.limit);
    }
    if (options?.offset) {
      query.offset(options.offset);
    }

    return query;
  }

  async create(data: NewToken) {
    const [token] = await this.db.insert(tokens).values(data).returning();
    return token;
  }

  async updateTranslations(id: string, newTranslations: Record<string, string>) {
    // Merge semantics: preserve existing translations, overlay new ones
    const [updated] = await this.db.update(tokens)
      .set({
        translations: sql`${tokens.translations} || ${JSON.stringify(newTranslations)}::jsonb`,
        updatedAt: new Date(),
      })
      .where(eq(tokens.id, id))
      .returning();
    return updated;
  }

  async bulkDelete(ids: string[]) {
    return this.db.delete(tokens).where(inArray(tokens.id, ids));
  }

  async bulkUpdateTags(ids: string[], tags: string[]) {
    return this.db.update(tokens)
      .set({ tags, updatedAt: new Date() })
      .where(inArray(tokens.id, ids));
  }
}
```

### Token Controller (New Dedicated Controller)

```typescript
@Controller('api/tokens')
export class TokenController {
  constructor(
    private tokenService: TokenService,
    private projectService: ProjectService,
  ) {}

  @Get(':projectId')
  @UseGuards(AuthGuard)
  async listTokens(
    @Param('projectId') projectId: string,
    @Query('search') search?: string,
    @Query('module') module?: string,
    @Query('status') status?: 'all' | 'completed' | 'incomplete',
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
    @CurrentUser() user: UserPayload,
  ) {
    await this.projectService.checkUserProjectPermission(projectId, user.userId);
    return this.tokenService.findByProject(projectId, { search, module, status, page, perPage });
  }

  @Get(':projectId/progress')
  @UseGuards(AuthGuard)
  async getProgress(
    @Param('projectId') projectId: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.projectService.checkUserProjectPermission(projectId, user.userId);
    return this.tokenService.getLanguageCompletion(projectId);
  }

  @Post('bulk')
  @UseGuards(AuthGuard)
  async bulkOperation(
    @Body() data: BulkOperationDto,
    @CurrentUser() user: UserPayload,
  ) {
    // Verify permission, execute bulk operation
  }
}
```

### Per-Language Completion Query

```typescript
async getLanguageCompletion(projectId: string): Promise<LanguageProgress[]> {
  const project = await this.projectRepository.findById(projectId);
  if (!project) throw new NotFoundException();

  const tokenCount = await this.db.select({ count: count() })
    .from(tokens)
    .where(eq(tokens.projectId, projectId));

  const total = tokenCount[0].count;
  if (total === 0) {
    return project.languages.map(lang => ({ language: lang, total: 0, completed: 0, percentage: 0 }));
  }

  const results: LanguageProgress[] = [];
  for (const lang of project.languages) {
    const [completed] = await this.db.select({ count: count() })
      .from(tokens)
      .where(and(
        eq(tokens.projectId, projectId),
        sql`${tokens.translations}->>${lang} IS NOT NULL AND ${tokens.translations}->>${lang} != ''`
      ));

    results.push({
      language: lang,
      total,
      completed: completed.count,
      percentage: Math.round((completed.count / total) * 100),
    });
  }

  return results;
}
```

## State of the Art

| Old Approach (Current) | New Approach (Phase 5) | Impact |
|------------------------|------------------------|--------|
| All token ops in ProjectService (1466 lines) | Dedicated TokenService + TokenController | Separation of concerns, testability |
| TokenHistory embedded as subdocument array | Separate `token_history` table with FK | Queryable history, proper relational model |
| Client-side search/filter (useMemo) | Server-side search with JSONB queries | Scalable to 10,000+ tokens per project |
| Client-side completion calculation | SQL aggregation on JSONB | Accurate, fast, no need to load all tokens |
| N individual DELETE requests for bulk delete | Single bulk endpoint with WHERE IN | Single round-trip, single transaction |
| Single `comment` string field | Keep single field (satisfies requirement) | Minimal change, simple |
| All tokens loaded via `populate('tokens')` on project | Separate paginated token endpoint | Faster project load, lazy token loading |

## Open Questions

1. **Comment threads vs single comment field**
   - What we know: TRANS-07 says "comments/notes on individual translation tokens". The current schema has a single `comment: string` field.
   - What's unclear: Whether the user wants threaded discussions or just a simple notes field.
   - Recommendation: Keep as single `comment` field for v1. The requirement says "comments/notes" which a single field satisfies. A thread model can be added later if users request it. This avoids adding a new table/model that may not be needed.

2. **Server-side vs client-side pagination strategy**
   - What we know: Current implementation loads all tokens and paginates client-side. The frontend uses `useMemo` for filtering.
   - What's unclear: How large real-world projects will be. Most i18n projects have 200-5000 tokens.
   - Recommendation: Implement server-side search/filter API but continue to support the "load all" pattern for the initial view. The search endpoint returns paginated results; the main token list can still load all tokens for projects under a threshold (e.g., 500). This gives a migration path without breaking the existing UX.

3. **Backward compatibility of API endpoints**
   - What we know: Current endpoints are under `/api/project/token*`. Phase 5 should introduce `/api/tokens/*`.
   - What's unclear: Whether any external consumers depend on current endpoints.
   - Recommendation: Create new `/api/tokens/*` endpoints. Update frontend to use new endpoints. Since this is a full platform migration (not a public API yet), backward compatibility is not a concern.

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `packages/server/src/service/project.service.ts` (1466 lines, all token logic analyzed)
- Codebase inspection: `packages/server/src/controller/project.controller.ts` (507 lines, all token endpoints analyzed)
- Codebase inspection: `packages/server/src/models/schemas/token.schema.ts` (69 lines, full schema analyzed)
- Codebase inspection: `packages/web/components/views/projectView/ProjectTokensTab/index.tsx` (849 lines, full frontend analyzed)
- Codebase inspection: `packages/web/components/views/projectView/ProjectTokensTab/TokenTable.tsx` (681 lines, table with selection/batch analyzed)
- Codebase inspection: `packages/web/api/project.ts` (231 lines, all API client functions analyzed)
- Codebase inspection: `packages/web/jotai/types.ts` (Token, TokenHistory, Translation type definitions)
- Codebase inspection: `packages/web/components/views/projectView/ProjectOverviewTab.tsx` (completion calculation logic)
- `.planning/REQUIREMENTS.md` -- All 11 requirement IDs for this phase
- `.planning/research/SUMMARY.md` -- Stack decisions (Drizzle, PGlite, PostgreSQL)
- `.planning/codebase/ARCHITECTURE.md` -- Layer architecture, data flow patterns

### Secondary (MEDIUM confidence)
- `.planning/research/FEATURES.md` -- Competitor analysis informing feature scope
- PostgreSQL JSONB documentation -- query patterns, operators, GIN indexing (from training knowledge, stable API)
- Drizzle ORM documentation -- JSONB column types, sql template usage (from training knowledge, verified against codebase usage)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries needed, all from Phase 2
- Architecture: HIGH - Based on direct codebase inspection of existing implementation
- Pitfalls: HIGH - All pitfalls derived from actual code patterns found in the codebase
- Code examples: MEDIUM - Drizzle JSONB query patterns based on documentation, not yet validated against this specific schema

**Research date:** 2026-03-01
**Valid until:** 2026-03-31 (stable domain, no fast-moving dependencies)
