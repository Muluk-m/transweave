# AI Connectors Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single `aiConfig` JSON column with a multi-connector model (team + project two-layer scope, model whitelist per connector, top-of-chat model chip selector). Refresh all hard-coded model IDs to current 2026-05 values.

**Architecture:** New `ai_connectors` table holds N rows per team/project (scope-aware). `teams` / `projects` get `default_connector_id` + `default_model` columns. A `ConnectorResolver` service replaces direct reads of `aiConfig`. Old `aiConfig` column remains a version as rollback anchor; old `PUT /api/ai/config/...` endpoint becomes an upsert shim. Web settings page becomes a master/detail panel; AgentChat gains a top model chip selector.

**Tech Stack:** NestJS 11, Drizzle ORM (PostgreSQL + PGlite), Next.js 15, React 19, TailwindCSS, Radix UI, Jotai, Jest, class-validator.

**Spec:** `docs/superpowers/specs/2026-05-11-ai-connectors-redesign-design.md`

---

## Phase A: Foundation

### Task 1: Static Provider Capabilities Table

**Files:**
- Create: `packages/server/src/ai/providers/capabilities.ts`
- Create: `packages/server/src/ai/providers/__tests__/capabilities.spec.ts`

- [ ] **Step 1: Write failing test**

`packages/server/src/ai/providers/__tests__/capabilities.spec.ts`:

```ts
import { PROVIDER_CAPABILITIES } from '../capabilities';
import { SUPPORTED_PROVIDERS } from '../translation-provider.interface';

describe('PROVIDER_CAPABILITIES', () => {
  it('covers every supported provider', () => {
    for (const p of SUPPORTED_PROVIDERS) {
      expect(PROVIDER_CAPABILITIES[p]).toBeDefined();
    }
  });

  it('every defaultModel is also in its own recommendedModels (when defaultModel is non-empty)', () => {
    for (const [provider, cap] of Object.entries(PROVIDER_CAPABILITIES)) {
      if (cap.defaultModel) {
        expect(cap.recommendedModels).toContain(cap.defaultModel);
      }
    }
  });

  it('openai-compatible requires baseUrl, deepl/google-translate do not support tool calling', () => {
    expect(PROVIDER_CAPABILITIES['openai-compatible'].requiresBaseUrl).toBe(true);
    expect(PROVIDER_CAPABILITIES['deepl'].toolCalling).toBe(false);
    expect(PROVIDER_CAPABILITIES['google-translate'].toolCalling).toBe(false);
  });

  it('LLM providers (toolCalling=true) all have a non-empty defaultModel or an empty recommendedModels (openai-compatible)', () => {
    for (const [provider, cap] of Object.entries(PROVIDER_CAPABILITIES)) {
      if (cap.toolCalling && provider !== 'openai-compatible') {
        expect(cap.defaultModel).not.toBe('');
        expect(cap.recommendedModels.length).toBeGreaterThan(0);
      }
    }
  });
});
```

- [ ] **Step 2: Run test, confirm it fails**

```
pnpm --filter @transweave/server test -- --testPathPattern=capabilities
```
Expected: FAIL — `Cannot find module '../capabilities'`.

- [ ] **Step 3: Write the capabilities table**

`packages/server/src/ai/providers/capabilities.ts`:

```ts
import type { ProviderType } from './translation-provider.interface';

export interface ProviderCapability {
  toolCalling: boolean;
  listModels: boolean;
  requiresBaseUrl: boolean;
  recommendedModels: string[];
  defaultModel: string;
}

// Current model snapshot (2026-05). Re-check this table on every release
// against vendor docs (also mirrored in /Users/qiqian/openclaw/docs/providers).
export const PROVIDER_CAPABILITIES: Record<ProviderType, ProviderCapability> = {
  openai: {
    toolCalling: true,
    listModels: true,
    requiresBaseUrl: false,
    recommendedModels: ['gpt-5.5', 'gpt-5.5-pro', 'gpt-5.5-thinking', 'gpt-5.5-instant'],
    defaultModel: 'gpt-5.5',
  },
  claude: {
    toolCalling: true,
    listModels: false,
    requiresBaseUrl: false,
    recommendedModels: ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
    defaultModel: 'claude-sonnet-4-6',
  },
  gemini: {
    toolCalling: true,
    listModels: true,
    requiresBaseUrl: false,
    recommendedModels: ['gemini-3-flash', 'gemini-3.1-pro', 'gemini-3.1-flash-lite'],
    defaultModel: 'gemini-3-flash',
  },
  deepseek: {
    toolCalling: true,
    listModels: true,
    requiresBaseUrl: false,
    recommendedModels: ['deepseek-v4-flash', 'deepseek-v4-pro'],
    defaultModel: 'deepseek-v4-flash',
  },
  'openai-compatible': {
    toolCalling: true,
    listModels: true,
    requiresBaseUrl: true,
    recommendedModels: [],
    defaultModel: '',
  },
  deepl: {
    toolCalling: false,
    listModels: false,
    requiresBaseUrl: false,
    recommendedModels: [],
    defaultModel: '',
  },
  'google-translate': {
    toolCalling: false,
    listModels: false,
    requiresBaseUrl: false,
    recommendedModels: [],
    defaultModel: '',
  },
};
```

Note: Tests reference `'openai-compatible'` as a `ProviderType`. We add it in Task 2 — this file will momentarily reference an undeclared key. Run the test only after Task 2 completes.

- [ ] **Step 4: Defer running tests until Task 2**

Move on to Task 2. Combined commit happens in Task 2 Step 6.

---

### Task 2: Add `openai-compatible` ProviderType and wire factory

**Files:**
- Modify: `packages/server/src/ai/providers/translation-provider.interface.ts:1-13`
- Modify: `packages/server/src/ai/providers/provider-factory.ts`
- Create test: covered by Task 1 spec + an extra factory case

- [ ] **Step 1: Update SUPPORTED_PROVIDERS and LLM_PROVIDERS**

Replace top of `translation-provider.interface.ts`:

```ts
export const SUPPORTED_PROVIDERS = [
  'openai',
  'claude',
  'deepseek',
  'gemini',
  'openai-compatible',
  'deepl',
  'google-translate',
] as const;

export type ProviderType = (typeof SUPPORTED_PROVIDERS)[number];

export const LLM_PROVIDERS = [
  'openai',
  'claude',
  'deepseek',
  'gemini',
  'openai-compatible',
] as const satisfies readonly ProviderType[];
export type LLMProviderType = (typeof LLM_PROVIDERS)[number];
```

- [ ] **Step 2: Add factory case for `openai-compatible`**

Open `packages/server/src/ai/providers/provider-factory.ts`. Add an import:

```ts
import { BaseOpenAICompatibleProvider } from './base-openai-compatible.provider';
```

Add a case in the switch:

```ts
    case 'openai-compatible':
      if (!config.baseUrl) {
        throw new Error('openai-compatible provider requires baseUrl');
      }
      return new BaseOpenAICompatibleProvider(
        'openai-compatible',
        config.apiKey,
        config.model ?? '',
        config.baseUrl,
      );
```

(Inspect `base-openai-compatible.provider.ts` to confirm the constructor signature; if it differs adjust the args. If `BaseOpenAICompatibleProvider` is abstract, create a concrete `OpenAICompatibleProvider` subclass that just passes the name through.)

- [ ] **Step 3: Run Task 1 + factory tests**

```
pnpm --filter @transweave/server test -- --testPathPattern='capabilities|provider-factory'
```
Expected: PASS (all assertions in `capabilities.spec.ts` green).

If any provider's `BaseOpenAICompatibleProvider` constructor signature mismatch surfaces, fix that first, then re-run.

- [ ] **Step 4: Sanity build**

```
pnpm --filter @transweave/server build
```
Expected: tsc succeeds.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/ai/providers/capabilities.ts \
        packages/server/src/ai/providers/__tests__/capabilities.spec.ts \
        packages/server/src/ai/providers/translation-provider.interface.ts \
        packages/server/src/ai/providers/provider-factory.ts
git commit -m "feat(ai): add provider capabilities table and openai-compatible provider type"
```

---

### Task 3: Replace hard-coded model defaults

**Files:**
- Modify: `packages/server/src/ai/providers/openai.provider.ts:9`
- Modify: `packages/server/src/ai/providers/claude.provider.ts:8`
- Modify: `packages/server/src/ai/providers/deepseek.provider.ts:9`
- Modify: `packages/server/src/ai/providers/gemini.provider.ts:8`
- Modify: `packages/server/src/service/agent.service.ts:287`
- Modify: `packages/web/components/views/settings/AiProviderSettings.tsx:70-111`

- [ ] **Step 1: Replace server defaults**

In each provider file, change the constructor `model` default. Example for `openai.provider.ts`:

```ts
// before:  model: string = 'gpt-4o-mini',
// after:
model: string = 'gpt-5.5',
```

Apply analogous changes:
- `claude.provider.ts`: `'claude-sonnet-4-20250514'` → `'claude-sonnet-4-6'`
- `deepseek.provider.ts`: `'deepseek-chat'` → `'deepseek-v4-flash'`
- `gemini.provider.ts`: `'gemini-2.0-flash'` → `'gemini-3-flash'`
- `agent.service.ts:287`: `config.model || 'gpt-4o-mini'` → `config.model || 'gpt-5.5'`

- [ ] **Step 2: Replace web defaults**

Open `packages/web/components/views/settings/AiProviderSettings.tsx`. Replace the `PROVIDERS` array (lines ~70-111). Patch:

```tsx
const PROVIDERS = [
  { value: "openai",            label: "OpenAI",            keyHint: "sk-...",         isLLM: true,  defaultModel: "gpt-5.5" },
  { value: "claude",            label: "Claude",            keyHint: "sk-ant-...",     isLLM: true,  defaultModel: "claude-sonnet-4-6" },
  { value: "deepseek",          label: "DeepSeek",          keyHint: "sk-...",         isLLM: true,  defaultModel: "deepseek-v4-flash" },
  { value: "gemini",            label: "Gemini",            keyHint: "AIza...",        isLLM: true,  defaultModel: "gemini-3-flash" },
  { value: "openai-compatible", label: "OpenAI-Compatible", keyHint: "any provider",   isLLM: true,  defaultModel: "" },
  { value: "deepl",             label: "DeepL",             keyHint: "...:fx",         isLLM: false, defaultModel: "" },
  { value: "google-translate",  label: "Google Translate",  keyHint: "service-account",isLLM: false, defaultModel: "" },
];
```

(The old file may have 6 entries; we add `openai-compatible` so the picker exposes it. Preserve any other attributes already on those entries.)

- [ ] **Step 3: Run web type check**

```
pnpm --filter @transweave/web lint
pnpm --filter @transweave/web build
```
Expected: succeeds.

- [ ] **Step 4: Run server tests**

```
pnpm --filter @transweave/server test
```
Expected: any existing tests that hard-coded the old model IDs may fail — update them to the new defaults. Notably check `ai/providers/__tests__/prompt.spec.ts` and any `ai.service` spec.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/ai/providers/{openai,claude,deepseek,gemini}.provider.ts \
        packages/server/src/service/agent.service.ts \
        packages/web/components/views/settings/AiProviderSettings.tsx
# include any updated tests:
git add packages/server/src/ai/providers/__tests__/
git commit -m "chore(ai): refresh hard-coded model defaults to 2026-05 current"
```

---

### Task 4: `ai_connectors` schema file

**Files:**
- Create: `packages/server/src/db/schema/ai-connectors.ts`
- Modify: `packages/server/src/db/schema/index.ts`

- [ ] **Step 1: Create the schema file**

`packages/server/src/db/schema/ai-connectors.ts`:

```ts
import { check, index, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { teams } from './teams';
import { projects } from './projects';
import { users } from './users';

export type EnabledModel = {
  modelId: string;
  label?: string;
  addedManually: boolean;
};

export const aiConnectors = pgTable(
  'ai_connectors',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    scope: varchar('scope', { length: 10 }).notNull(),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),

    displayName: varchar('display_name', { length: 80 }).notNull(),
    provider: varchar('provider', { length: 30 }).notNull(),

    apiKey: text('api_key').notNull(),
    baseUrl: varchar('base_url', { length: 500 }),

    enabledModels: jsonb('enabled_models').$type<EnabledModel[]>().notNull().default([]),

    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('ai_connectors_team_id_idx').on(table.teamId),
    index('ai_connectors_project_id_idx').on(table.projectId),
    check(
      'ai_connectors_scope_consistent',
      sql`(scope = 'team' AND project_id IS NULL) OR (scope = 'project' AND project_id IS NOT NULL)`,
    ),
  ],
);

export type AiConnector = typeof aiConnectors.$inferSelect;
export type NewAiConnector = typeof aiConnectors.$inferInsert;
```

- [ ] **Step 2: Wire into schema index**

Append to `packages/server/src/db/schema/index.ts`:

```ts
export * from './ai-connectors';
```

- [ ] **Step 3: Add default columns to teams + projects**

Modify `packages/server/src/db/schema/teams.ts`:

```ts
import { jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import type { AiConfigStored } from '../../ai/providers/translation-provider.interface';

export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  url: text('url').notNull(),
  aiConfig: jsonb('ai_config').$type<AiConfigStored>(),   // kept as rollback anchor; dropped next version
  defaultConnectorId: uuid('default_connector_id'),       // no FK in schema to avoid circular table imports; FK added in migration
  defaultModel: varchar('default_model', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
```

Modify `packages/server/src/db/schema/projects.ts` analogously — add the same two columns next to the existing `aiConfig` column. Use the same import style:

```ts
// inside projects pgTable definition:
    aiConfig: jsonb('ai_config').$type<...>(),
    defaultConnectorId: uuid('default_connector_id'),
    defaultModel: varchar('default_model', { length: 100 }),
```

(Make sure to import `varchar` if not already imported.)

- [ ] **Step 4: Confirm types compile**

```
pnpm --filter @transweave/server build
```
Expected: PASS.

- [ ] **Step 5: Commit (schema only — migration in next task)**

```bash
git add packages/server/src/db/schema/
git commit -m "feat(db): add ai_connectors schema and default connector columns on teams/projects"
```

---

### Task 5: Generate and finalize migration 0013

**Files:**
- Create: `packages/server/src/db/migrations/0013_ai_connectors.sql`
- Modify: `packages/server/src/db/migrations/meta/_journal.json` (drizzle-kit auto)

- [ ] **Step 1: Run drizzle-kit generate**

```
pnpm --filter @transweave/server drizzle-kit generate --name=ai_connectors
```

Expected: creates `0013_<auto-name>.sql` and updates `meta/_journal.json`. Rename the file to `0013_ai_connectors.sql` if it produced a different suffix, and update the journal entry to match.

- [ ] **Step 2: Hand-edit migration to add the FK and statement breakpoints**

drizzle-kit may not emit the FK from `teams.default_connector_id` → `ai_connectors.id` because the schema-level reference was omitted (intentional, to break the circular import). Add it manually at the end of the generated SQL. The full file should look like:

```sql
CREATE TABLE IF NOT EXISTS "ai_connectors" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "scope" varchar(10) NOT NULL,
    "team_id" uuid NOT NULL,
    "project_id" uuid,
    "display_name" varchar(80) NOT NULL,
    "provider" varchar(30) NOT NULL,
    "api_key" text NOT NULL,
    "base_url" varchar(500),
    "enabled_models" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "created_by" uuid,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "ai_connectors_scope_consistent" CHECK (
        (scope = 'team' AND project_id IS NULL) OR (scope = 'project' AND project_id IS NOT NULL)
    )
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_connectors_team_id_idx" ON "ai_connectors" USING btree ("team_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_connectors_project_id_idx" ON "ai_connectors" USING btree ("project_id");
--> statement-breakpoint
ALTER TABLE "ai_connectors" ADD CONSTRAINT "ai_connectors_team_id_fk"
    FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "ai_connectors" ADD CONSTRAINT "ai_connectors_project_id_fk"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "ai_connectors" ADD CONSTRAINT "ai_connectors_created_by_fk"
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "default_connector_id" uuid;
--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "default_model" varchar(100);
--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_default_connector_id_fk"
    FOREIGN KEY ("default_connector_id") REFERENCES "ai_connectors"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "default_connector_id" uuid;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "default_model" varchar(100);
--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_default_connector_id_fk"
    FOREIGN KEY ("default_connector_id") REFERENCES "ai_connectors"("id") ON DELETE SET NULL;
```

Note: `--> statement-breakpoint` is required for PGlite compatibility (see commit d857f27).

- [ ] **Step 3: Run migration against PGlite locally**

```
rm -rf packages/server/data/pglite     # wipe local db
pnpm --filter @transweave/server start:dev
```
Watch logs for migration application. Confirm `[Drizzle] Applied migration 0013_ai_connectors`. Stop the dev server (Ctrl+C).

- [ ] **Step 4: Verify schema in PGlite**

```
pnpm --filter @transweave/server drizzle-kit studio
```
Browse — `ai_connectors` table should exist; `teams` / `projects` should each have `default_connector_id` and `default_model`. Close studio.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/db/migrations/0013_ai_connectors.sql \
        packages/server/src/db/migrations/meta/
git commit -m "feat(db): migration 0013 - ai_connectors table + default columns"
```

---

## Phase B: Repository + Resolver

### Task 6: `AiConnectorRepository`

**Files:**
- Create: `packages/server/src/repository/ai-connector.repository.ts`
- Create: `packages/server/src/repository/__tests__/ai-connector.repository.spec.ts`

- [ ] **Step 1: Write failing test**

`packages/server/src/repository/__tests__/ai-connector.repository.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { DRIZZLE } from '../../db/drizzle.provider';
import { drizzlePgliteForTest } from '../../db/__test-utils__/pglite';  // if doesn't exist, see below
import { AiConnectorRepository } from '../ai-connector.repository';

describe('AiConnectorRepository', () => {
  let repo: AiConnectorRepository;
  let teamId: string;
  let projectId: string;

  beforeEach(async () => {
    const db = await drizzlePgliteForTest();
    const moduleRef = await Test.createTestingModule({
      providers: [AiConnectorRepository, { provide: DRIZZLE, useValue: db }],
    }).compile();
    repo = moduleRef.get(AiConnectorRepository);

    // seed a team + project — replace with the project's actual test helper if one exists
    [teamId, projectId] = await seedTeamAndProject(db);
  });

  it('creates and lists team-scoped connectors', async () => {
    await repo.create({
      scope: 'team', teamId, projectId: null,
      displayName: 'OpenAI Main', provider: 'openai',
      apiKey: 'enc:abc', baseUrl: null, enabledModels: [{ modelId: 'gpt-5.5', addedManually: false }],
    } as any);
    const list = await repo.listForTeam(teamId);
    expect(list).toHaveLength(1);
    expect(list[0].displayName).toBe('OpenAI Main');
  });

  it('lists project-visible connectors as team-shared + project-private', async () => {
    await repo.create({ scope: 'team', teamId, projectId: null, displayName: 'T', provider: 'claude', apiKey: 'enc:1', enabledModels: [] } as any);
    await repo.create({ scope: 'project', teamId, projectId, displayName: 'P', provider: 'openai', apiKey: 'enc:2', enabledModels: [] } as any);
    const list = await repo.listForProject(projectId);
    expect(list.map((c) => c.displayName).sort()).toEqual(['P', 'T']);
  });
});

// Local helper. If the repo already has a shared fixture in src/db/__test-utils__,
// import from there instead.
async function seedTeamAndProject(db: any): Promise<[string, string]> {
  const [team] = await db.insert(/* teams */).values({ name: 't', url: 't' }).returning();
  const [project] = await db.insert(/* projects */).values({ name: 'p', url: 'p', teamId: team.id }).returning();
  return [team.id, project.id];
}
```

If `drizzlePgliteForTest` / `seedTeamAndProject` helpers don't exist, scan for `*.spec.ts` files that already use PGlite for repository tests (likely `glossary` or `translation-memory` repos) and follow that pattern verbatim. Inline-quoting the helper here is fine — but **do not invent table imports**.

- [ ] **Step 2: Run test, confirm fail**

```
pnpm --filter @transweave/server test -- --testPathPattern=ai-connector.repository
```
Expected: FAIL — `Cannot find module '../ai-connector.repository'`.

- [ ] **Step 3: Implement repository**

`packages/server/src/repository/ai-connector.repository.ts`:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { and, eq, or, isNull } from 'drizzle-orm';
import { DRIZZLE } from '../db/drizzle.provider';
import type { DrizzleDB } from '../db/drizzle.types';
import {
  aiConnectors,
  type AiConnector,
  type NewAiConnector,
} from '../db/schema';
import { BaseRepository } from './base.repository';

@Injectable()
export class AiConnectorRepository extends BaseRepository<
  typeof aiConnectors,
  AiConnector,
  NewAiConnector
> {
  constructor(@Inject(DRIZZLE) db: DrizzleDB) {
    super(db, aiConnectors);
  }

  async listForTeam(teamId: string): Promise<AiConnector[]> {
    return this.db
      .select()
      .from(aiConnectors)
      .where(and(eq(aiConnectors.teamId, teamId), eq(aiConnectors.scope, 'team')));
  }

  /** Returns team-scoped connectors (shared) + project-private connectors. */
  async listForProject(projectId: string): Promise<AiConnector[]> {
    // Look up the team this project belongs to via a sub-select.
    return this.db
      .select()
      .from(aiConnectors)
      .where(
        or(
          eq(aiConnectors.projectId, projectId),
          and(
            eq(aiConnectors.scope, 'team'),
            isNull(aiConnectors.projectId),
            // teamId match: find via projects table join
            // simplest impl below — see step 4 if performance becomes a concern
          ),
        ),
      );
  }

  override async update(id: string, data: Partial<NewAiConnector>) {
    const [row] = await this.db
      .update(aiConnectors)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(aiConnectors.id, id))
      .returning();
    return row ?? null;
  }
}
```

The `listForProject` body as written returns ALL team-scoped connectors of any team. Fix by joining via `projects.teamId`. Replace the body and the `aiConnectors` import line with:

```ts
import { aiConnectors, projects, type AiConnector, type NewAiConnector } from '../db/schema';

// ... inside the class:
  async listForProject(projectId: string): Promise<AiConnector[]> {
    const [proj] = await this.db
      .select({ teamId: projects.teamId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);
    if (!proj) return [];
    return this.db
      .select()
      .from(aiConnectors)
      .where(
        or(
          eq(aiConnectors.projectId, projectId),
          and(eq(aiConnectors.scope, 'team'), eq(aiConnectors.teamId, proj.teamId)),
        ),
      );
  }
```

- [ ] **Step 4: Run tests, confirm pass**

```
pnpm --filter @transweave/server test -- --testPathPattern=ai-connector.repository
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/repository/ai-connector.repository.ts \
        packages/server/src/repository/__tests__/ai-connector.repository.spec.ts
git commit -m "feat(server): add AiConnectorRepository with team/project listing"
```

---

### Task 7: `ConnectorResolver` service

**Files:**
- Create: `packages/server/src/ai/connector-resolver.service.ts`
- Create: `packages/server/src/ai/__tests__/connector-resolver.service.spec.ts`

- [ ] **Step 1: Write failing test**

`packages/server/src/ai/__tests__/connector-resolver.service.spec.ts`:

```ts
import { ConnectorResolver } from '../connector-resolver.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('ConnectorResolver.resolve', () => {
  const projectId = 'p1';
  const teamId = 't1';
  const teamConn = { id: 'tc', scope: 'team', teamId, projectId: null, provider: 'openai', apiKey: 'enc:k', baseUrl: null, enabledModels: [{ modelId: 'gpt-5.5', addedManually: false }] };
  const projConn = { id: 'pc', scope: 'project', teamId, projectId, provider: 'claude', apiKey: 'enc:k', baseUrl: null, enabledModels: [{ modelId: 'claude-sonnet-4-6', addedManually: false }] };

  function makeResolver(opts: {
    project?: any; team?: any; connectorById?: Record<string, any>;
  }) {
    const projects = { findById: jest.fn().mockResolvedValue(opts.project ?? null) };
    const teams = { findById: jest.fn().mockResolvedValue(opts.team ?? null) };
    const connectors = {
      findById: jest.fn().mockImplementation((id) => Promise.resolve(opts.connectorById?.[id] ?? null)),
    };
    return new ConnectorResolver(connectors as any, projects as any, teams as any);
  }

  it('uses explicit override when provided', async () => {
    const r = makeResolver({
      project: { id: projectId, teamId, defaultConnectorId: null, defaultModel: null },
      team: { id: teamId, defaultConnectorId: null, defaultModel: null },
      connectorById: { tc: teamConn },
    });
    const res = await r.resolve(projectId, { connectorId: 'tc', model: 'gpt-5.5' });
    expect(res.source).toBe('explicit');
    expect(res.connector.id).toBe('tc');
    expect(res.model).toBe('gpt-5.5');
  });

  it('rejects explicit override when connector belongs to a different team', async () => {
    const otherTeamConn = { ...teamConn, teamId: 'other' };
    const r = makeResolver({
      project: { id: projectId, teamId },
      connectorById: { tc: otherTeamConn },
    });
    await expect(r.resolve(projectId, { connectorId: 'tc', model: 'gpt-5.5' })).rejects.toThrow(ForbiddenException);
  });

  it('falls back to project default', async () => {
    const r = makeResolver({
      project: { id: projectId, teamId, defaultConnectorId: 'pc', defaultModel: 'claude-sonnet-4-6' },
      team: { id: teamId, defaultConnectorId: null, defaultModel: null },
      connectorById: { pc: projConn },
    });
    const res = await r.resolve(projectId);
    expect(res.source).toBe('project');
    expect(res.connector.id).toBe('pc');
  });

  it('falls back to team default when project has none', async () => {
    const r = makeResolver({
      project: { id: projectId, teamId, defaultConnectorId: null, defaultModel: null },
      team: { id: teamId, defaultConnectorId: 'tc', defaultModel: 'gpt-5.5' },
      connectorById: { tc: teamConn },
    });
    const res = await r.resolve(projectId);
    expect(res.source).toBe('team');
  });

  it('throws when nothing is configured', async () => {
    const r = makeResolver({
      project: { id: projectId, teamId, defaultConnectorId: null, defaultModel: null },
      team: { id: teamId, defaultConnectorId: null, defaultModel: null },
    });
    await expect(r.resolve(projectId)).rejects.toThrow(/AI_NOT_CONFIGURED/);
  });

  it('throws NotFoundException when project does not exist', async () => {
    const r = makeResolver({});
    await expect(r.resolve(projectId)).rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 2: Run, confirm fail**

```
pnpm --filter @transweave/server test -- --testPathPattern=connector-resolver
```
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement**

`packages/server/src/ai/connector-resolver.service.ts`:

```ts
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ProjectRepository } from '../repository/project.repository';
import { TeamRepository } from '../repository/team.repository';
import { AiConnectorRepository } from '../repository/ai-connector.repository';
import type { AiConnector } from '../db/schema';

export interface ResolvedConnector {
  connector: AiConnector;
  model: string;
  source: 'explicit' | 'project' | 'team';
}

@Injectable()
export class ConnectorResolver {
  constructor(
    private readonly connectors: AiConnectorRepository,
    private readonly projects: ProjectRepository,
    private readonly teams: TeamRepository,
  ) {}

  async resolve(
    projectId: string,
    override?: { connectorId?: string; model?: string },
  ): Promise<ResolvedConnector> {
    const project = await this.projects.findById(projectId);
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    if (override?.connectorId) {
      const c = await this.connectors.findById(override.connectorId);
      if (!c) throw new NotFoundException(`Connector ${override.connectorId} not found`);
      if (c.teamId !== project.teamId) {
        throw new ForbiddenException('Connector does not belong to this project\'s team');
      }
      const model = override.model ?? c.enabledModels[0]?.modelId;
      if (!model) throw new Error('AI_NOT_CONFIGURED: no model specified and connector has no enabledModels');
      return { connector: c, model, source: 'explicit' };
    }

    if (project.defaultConnectorId && project.defaultModel) {
      const c = await this.connectors.findById(project.defaultConnectorId);
      if (c) return { connector: c, model: project.defaultModel, source: 'project' };
    }

    const team = await this.teams.findById(project.teamId);
    if (team?.defaultConnectorId && team?.defaultModel) {
      const c = await this.connectors.findById(team.defaultConnectorId);
      if (c) return { connector: c, model: team.defaultModel, source: 'team' };
    }

    throw new Error('AI_NOT_CONFIGURED: no connector configured at project or team level');
  }

  listForProject(projectId: string) {
    return this.connectors.listForProject(projectId);
  }
  listForTeam(teamId: string) {
    return this.connectors.listForTeam(teamId);
  }
}
```

- [ ] **Step 4: Run tests, confirm pass**

```
pnpm --filter @transweave/server test -- --testPathPattern=connector-resolver
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/ai/connector-resolver.service.ts \
        packages/server/src/ai/__tests__/connector-resolver.service.spec.ts
git commit -m "feat(ai): ConnectorResolver with explicit/project/team resolution"
```

---

## Phase C: Migration of legacy `aiConfig`

### Task 8: `AiConnectorMigrationService`

**Files:**
- Create: `packages/server/src/ai/ai-connector-migration.service.ts`
- Create: `packages/server/src/ai/__tests__/ai-connector-migration.service.spec.ts`

- [ ] **Step 1: Write failing test**

`packages/server/src/ai/__tests__/ai-connector-migration.service.spec.ts`:

```ts
import { AiConnectorMigrationService } from '../ai-connector-migration.service';

describe('AiConnectorMigrationService.runOnce', () => {
  const oldTeamConfig = { provider: 'openai', apiKey: 'enc:abc', model: 'gpt-5.5', baseUrl: null };
  const oldProjectConfig = { provider: 'claude', apiKey: 'enc:def', model: 'claude-sonnet-4-6', baseUrl: null };

  function makeService(initial: { teams: any[]; projects: any[] }) {
    const teams = [...initial.teams];
    const projects = [...initial.projects];
    const created: any[] = [];
    const connectors = {
      create: jest.fn(async (data) => { const row = { id: `c${created.length + 1}`, ...data }; created.push(row); return row; }),
    };
    const teamRepo = {
      findAllWithLegacyConfig: jest.fn().mockResolvedValue(teams.filter((t) => t.aiConfig && !t.defaultConnectorId)),
      update: jest.fn(async (id, patch) => { Object.assign(teams.find((t) => t.id === id), patch); }),
    };
    const projectRepo = {
      findAllWithLegacyConfig: jest.fn().mockResolvedValue(projects.filter((p) => p.aiConfig && !p.defaultConnectorId)),
      update: jest.fn(async (id, patch) => { Object.assign(projects.find((p) => p.id === id), patch); }),
    };
    const svc = new AiConnectorMigrationService(connectors as any, teamRepo as any, projectRepo as any);
    return { svc, teams, projects, created, connectors, teamRepo, projectRepo };
  }

  it('migrates team with legacy aiConfig into a Default connector + sets default', async () => {
    const { svc, teams, created } = makeService({
      teams: [{ id: 't1', aiConfig: oldTeamConfig, defaultConnectorId: null }],
      projects: [],
    });
    await svc.runOnce();
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ scope: 'team', teamId: 't1', provider: 'openai', displayName: 'Default (migrated)' });
    expect(created[0].enabledModels).toEqual([{ modelId: 'gpt-5.5', addedManually: true }]);
    expect(teams[0].defaultConnectorId).toBe(created[0].id);
    expect(teams[0].defaultModel).toBe('gpt-5.5');
  });

  it('migrates project legacy aiConfig as project-scoped connector', async () => {
    const { svc, projects, created } = makeService({
      teams: [{ id: 't1', aiConfig: null, defaultConnectorId: null }],
      projects: [{ id: 'p1', teamId: 't1', aiConfig: oldProjectConfig, defaultConnectorId: null }],
    });
    await svc.runOnce();
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ scope: 'project', teamId: 't1', projectId: 'p1', provider: 'claude' });
    expect(projects[0].defaultConnectorId).toBe(created[0].id);
  });

  it('is idempotent — a second run does nothing', async () => {
    const { svc, created } = makeService({
      teams: [{ id: 't1', aiConfig: oldTeamConfig, defaultConnectorId: 'already' }],
      projects: [],
    });
    await svc.runOnce();
    expect(created).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run, confirm fail**

```
pnpm --filter @transweave/server test -- --testPathPattern=ai-connector-migration
```
Expected: FAIL.

- [ ] **Step 3: Implement migration service**

`packages/server/src/ai/ai-connector-migration.service.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common';
import { AiConnectorRepository } from '../repository/ai-connector.repository';
import { TeamRepository } from '../repository/team.repository';
import { ProjectRepository } from '../repository/project.repository';
import { PROVIDER_CAPABILITIES } from './providers/capabilities';
import type { ProviderType, AiConfigStored } from './providers/translation-provider.interface';

@Injectable()
export class AiConnectorMigrationService {
  private readonly logger = new Logger(AiConnectorMigrationService.name);

  constructor(
    private readonly connectors: AiConnectorRepository,
    private readonly teams: TeamRepository,
    private readonly projects: ProjectRepository,
  ) {}

  async runOnce(): Promise<{ migratedTeams: number; migratedProjects: number }> {
    let migratedTeams = 0;
    let migratedProjects = 0;

    const legacyTeams = await this.teams.findAllWithLegacyConfig();
    for (const team of legacyTeams) {
      const conn = await this.createMigratedConnector('team', team.id, null, team.aiConfig!);
      await this.teams.update(team.id, {
        defaultConnectorId: conn.id,
        defaultModel: this.resolveModel(team.aiConfig!),
      } as any);
      migratedTeams++;
    }

    const legacyProjects = await this.projects.findAllWithLegacyConfig();
    for (const proj of legacyProjects) {
      const conn = await this.createMigratedConnector('project', proj.teamId, proj.id, proj.aiConfig!);
      await this.projects.update(proj.id, {
        defaultConnectorId: conn.id,
        defaultModel: this.resolveModel(proj.aiConfig!),
      } as any);
      migratedProjects++;
    }

    if (migratedTeams || migratedProjects) {
      this.logger.log(`AI connector migration: ${migratedTeams} team(s), ${migratedProjects} project(s)`);
    }
    return { migratedTeams, migratedProjects };
  }

  private resolveModel(legacy: AiConfigStored): string | null {
    if (legacy.model) return legacy.model;
    const cap = PROVIDER_CAPABILITIES[legacy.provider as ProviderType];
    return cap?.defaultModel || null;
  }

  private async createMigratedConnector(
    scope: 'team' | 'project',
    teamId: string,
    projectId: string | null,
    legacy: AiConfigStored,
  ) {
    const model = legacy.model;
    return this.connectors.create({
      scope,
      teamId,
      projectId,
      displayName: 'Default (migrated)',
      provider: legacy.provider,
      apiKey: legacy.apiKey,
      baseUrl: legacy.baseUrl ?? null,
      enabledModels: model ? [{ modelId: model, addedManually: true }] : [],
    } as any);
  }
}
```

- [ ] **Step 4: Add `findAllWithLegacyConfig` helpers**

Modify `packages/server/src/repository/team.repository.ts`:

```ts
import { eq, and, isNotNull, isNull } from 'drizzle-orm';
// ...
  async findAllWithLegacyConfig(): Promise<Team[]> {
    return this.db
      .select()
      .from(teams)
      .where(and(isNotNull(teams.aiConfig), isNull(teams.defaultConnectorId))) as Promise<Team[]>;
  }
```

Modify `packages/server/src/repository/project.repository.ts` analogously.

- [ ] **Step 5: Run tests, confirm pass**

```
pnpm --filter @transweave/server test -- --testPathPattern=ai-connector-migration
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/server/src/ai/ai-connector-migration.service.ts \
        packages/server/src/ai/__tests__/ai-connector-migration.service.spec.ts \
        packages/server/src/repository/team.repository.ts \
        packages/server/src/repository/project.repository.ts
git commit -m "feat(ai): migration service for legacy aiConfig → connectors"
```

---

### Task 9: Wire migration to module init

**Files:**
- Modify: `packages/server/src/ai/ai.module.ts`

- [ ] **Step 1: Register providers and trigger migration**

Open `packages/server/src/ai/ai.module.ts`. Add `AiConnectorMigrationService`, `ConnectorResolver`, `AiConnectorRepository` to providers, and call `runOnce()` from `onModuleInit`:

```ts
import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AiConfigService } from './ai-config.service';
import { AiConfigController } from './ai-config.controller';
import { ConnectorResolver } from './connector-resolver.service';
import { AiConnectorMigrationService } from './ai-connector-migration.service';
import { AiConnectorRepository } from '../repository/ai-connector.repository';
// ... existing imports

@Module({
  // ... imports
  providers: [
    AiService,
    AiConfigService,
    ConnectorResolver,
    AiConnectorMigrationService,
    AiConnectorRepository,
    // existing
  ],
  controllers: [AiController, AiConfigController],
  exports: [AiService, AiConfigService, ConnectorResolver, AiConnectorRepository],
})
export class AiModule implements OnModuleInit {
  private readonly logger = new Logger(AiModule.name);
  constructor(private readonly migration: AiConnectorMigrationService) {}
  async onModuleInit() {
    try {
      await this.migration.runOnce();
    } catch (e) {
      this.logger.error('AI connector migration failed', e instanceof Error ? e.stack : e);
    }
  }
}
```

- [ ] **Step 2: Boot the server**

```
pnpm --filter @transweave/server start:dev
```
Confirm in logs that `AiConnectorMigrationService` runs (even if 0 rows). Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/ai/ai.module.ts
git commit -m "feat(ai): run connector migration on module init"
```

---

## Phase D: Refactor existing services

### Task 10: AiService uses `ConnectorResolver`

**Files:**
- Modify: `packages/server/src/ai/ai.service.ts`

- [ ] **Step 1: Replace `aiConfig` direct reads**

Open `packages/server/src/ai/ai.service.ts`. Find the method that resolves the active config from `project.aiConfig` / `team.aiConfig` (around lines 65-80 per the current source). Replace it with a delegation to `ConnectorResolver`. Inject the resolver in the constructor:

```ts
import { ConnectorResolver, ResolvedConnector } from './connector-resolver.service';
import { decryptApiKey } from './encryption.util';

@Injectable()
export class AiService {
  constructor(
    // ... existing
    private readonly resolver: ConnectorResolver,
  ) {}

  private async resolveActiveConfig(
    projectId: string,
    override?: { connectorId?: string; model?: string },
  ): Promise<{ provider: string; apiKey: string; model: string; baseUrl?: string | null }> {
    const r = await this.resolver.resolve(projectId, override);
    return {
      provider: r.connector.provider,
      apiKey: decryptApiKey(r.connector.apiKey),
      model: r.model,
      baseUrl: r.connector.baseUrl,
    };
  }
}
```

Update every call site that used to read `project.aiConfig`/`team.aiConfig` to call `resolveActiveConfig(projectId, { connectorId?, model? })` and pass the override through from the API layer.

- [ ] **Step 2: Run server tests**

```
pnpm --filter @transweave/server test
```
Expected: PASS. If failing tests stub `aiConfig` directly, switch them to stubbing `ConnectorResolver.resolve`.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/ai/ai.service.ts
# include any updated tests
git commit -m "refactor(ai): AiService reads config via ConnectorResolver"
```

---

### Task 11: AgentService uses resolver + capability check

**Files:**
- Modify: `packages/server/src/service/agent.service.ts:42-131,~285`

- [ ] **Step 1: Replace `TOOL_CALLING_PROVIDERS` constant with capabilities lookup**

Around line 42 you'll find a constant like `const TOOL_CALLING_PROVIDERS = [...]`. Delete it. Replace the check around line 122-131 with a `PROVIDER_CAPABILITIES`-driven assertion:

```ts
import { PROVIDER_CAPABILITIES } from '../ai/providers/capabilities';
import type { ProviderType } from '../ai/providers/translation-provider.interface';

// ... inside the method:
const provider = resolved.connector.provider as ProviderType;
const cap = PROVIDER_CAPABILITIES[provider];
if (!cap?.toolCalling) {
  throw new BadRequestException(
    `AI provider "${provider}" does not support the Agent chat feature. Configure an LLM provider that supports tool calling.`,
  );
}
```

Replace the config resolution (lines that walk `project.aiConfig`/`team.aiConfig`) with:

```ts
import { ConnectorResolver } from '../ai/connector-resolver.service';
// constructor: + private readonly resolver: ConnectorResolver

const resolved = await this.resolver.resolve(projectId, { connectorId, model });
```

Around line ~287 the fallback `config.model || 'gpt-4o-mini'` becomes:

```ts
const modelToUse = resolved.model || PROVIDER_CAPABILITIES[resolved.connector.provider as ProviderType]?.defaultModel || 'gpt-5.5';
```

Update the `agentChat()` signature to accept the override:

```ts
async agentChat(
  message: string,
  projectId: string,
  history: AgentMessage[],
  options: { connectorId?: string; model?: string } = {},
  onEvent: (e: AgentEvent) => void,
): Promise<void> { /* ... */ }
```

- [ ] **Step 2: Update agent controller to pass override**

Open `packages/server/src/controller/agent.controller.ts`. The route that streams agent events (around line 33 / 66) currently destructures the request body. Add `connectorId` and `model` to that body shape:

```ts
@Post('chat')
async chat(
  @Body() body: { projectId: string; message: string; history: AgentMessage[]; connectorId?: string; model?: string },
  @CurrentUser() user: UserPayload,
  @Res() res: Response,
) {
  // ... existing membership checks
  await this.agentService.agentChat(
    body.message,
    body.projectId,
    body.history,
    { connectorId: body.connectorId, model: body.model },
    (event) => { /* existing SSE write */ },
  );
}
```

Match the exact existing signature/decorators in the file; only the body type and the new options arg need change.

- [ ] **Step 3: Run tests**

```
pnpm --filter @transweave/server test
```
Expected: PASS. Fix any stubs.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/service/agent.service.ts \
        packages/server/src/controller/  # whichever file is the agent controller
git commit -m "refactor(ai): AgentService uses ConnectorResolver and capabilities table"
```

---

## Phase E: New API surface

### Task 12: AiConnectors CRUD controller

**Files:**
- Create: `packages/server/src/ai/ai-connectors.controller.ts`
- Create: `packages/server/src/ai/dto/ai-connector.dto.ts`
- Modify: `packages/server/src/ai/ai.module.ts`
- Create: `packages/server/test/ai-connectors.e2e-spec.ts`

- [ ] **Step 1: DTO**

`packages/server/src/ai/dto/ai-connector.dto.ts`:

```ts
import { IsArray, IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SUPPORTED_PROVIDERS } from '../providers/translation-provider.interface';

export class EnabledModelDto {
  @IsString() @IsNotEmpty() modelId!: string;
  @IsOptional() @IsString() label?: string;
  @IsBoolean() addedManually!: boolean;
}

export class CreateConnectorDto {
  @IsIn(['team', 'project']) scope!: 'team' | 'project';
  @IsUUID() teamId!: string;
  @IsOptional() @IsUUID() projectId?: string;
  @IsString() @IsNotEmpty() @MaxLength(80) displayName!: string;
  @IsIn(SUPPORTED_PROVIDERS as readonly string[]) provider!: string;
  @IsString() @IsNotEmpty() apiKey!: string;
  @IsOptional() @IsString() @MaxLength(500) baseUrl?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => EnabledModelDto) enabledModels!: EnabledModelDto[];
}

export class UpdateConnectorDto {
  @IsOptional() @IsString() @MaxLength(80) displayName?: string;
  @IsOptional() @IsString() apiKey?: string;     // empty / undefined means "don't change"
  @IsOptional() @IsString() @MaxLength(500) baseUrl?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => EnabledModelDto) enabledModels?: EnabledModelDto[];
}
```

- [ ] **Step 2: Controller skeleton**

`packages/server/src/ai/ai-connectors.controller.ts`:

```ts
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '../jwt/guard';
import { AiConnectorRepository } from '../repository/ai-connector.repository';
import { MembershipRepository } from '../repository/membership.repository';
import { ProjectRepository } from '../repository/project.repository';
import { CreateConnectorDto, UpdateConnectorDto } from './dto/ai-connector.dto';
import { encryptApiKey, maskApiKey } from './encryption.util';
import { PROVIDER_CAPABILITIES } from './providers/capabilities';
import type { ProviderType } from './providers/translation-provider.interface';
import { CurrentUser, UserPayload } from '../jwt/current-user.decorator';

@Controller('api/ai/connectors')
@UseGuards(AuthGuard)
export class AiConnectorsController {
  constructor(
    private readonly connectors: AiConnectorRepository,
    private readonly memberships: MembershipRepository,
    private readonly projects: ProjectRepository,
  ) {}

  @Get()
  async list(@Query('teamId') teamId: string | undefined, @Query('projectId') projectId: string | undefined, @CurrentUser() user: UserPayload) {
    if (!teamId && !projectId) throw new BadRequestException('teamId or projectId required');
    const targetTeamId = teamId ?? (await this.projects.findById(projectId!))?.teamId;
    if (!targetTeamId) throw new NotFoundException('project not found');
    await this.assertTeamMember(user.id, targetTeamId);
    const rows = projectId
      ? await this.connectors.listForProject(projectId)
      : await this.connectors.listForTeam(teamId!);
    return rows.map(this.maskRow);
  }

  @Post()
  async create(@Body() dto: CreateConnectorDto, @CurrentUser() user: UserPayload) {
    this.validateScope(dto);
    this.validateBaseUrlForProvider(dto);
    await this.assertTeamRole(user.id, dto.teamId, ['owner', 'manager']);
    const row = await this.connectors.create({
      scope: dto.scope,
      teamId: dto.teamId,
      projectId: dto.scope === 'project' ? dto.projectId! : null,
      displayName: dto.displayName,
      provider: dto.provider,
      apiKey: encryptApiKey(dto.apiKey),
      baseUrl: dto.baseUrl ?? null,
      enabledModels: dto.enabledModels,
      createdBy: user.id,
    } as any);
    return this.maskRow(row);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateConnectorDto, @CurrentUser() user: UserPayload) {
    const existing = await this.connectors.findById(id);
    if (!existing) throw new NotFoundException();
    await this.assertTeamRole(user.id, existing.teamId, ['owner', 'manager']);
    const patch: any = {};
    if (dto.displayName !== undefined) patch.displayName = dto.displayName;
    if (dto.apiKey) patch.apiKey = encryptApiKey(dto.apiKey);
    if (dto.baseUrl !== undefined) patch.baseUrl = dto.baseUrl;
    if (dto.enabledModels !== undefined) patch.enabledModels = dto.enabledModels;
    const updated = await this.connectors.update(id, patch);
    return this.maskRow(updated!);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    const existing = await this.connectors.findById(id);
    if (!existing) throw new NotFoundException();
    await this.assertTeamRole(user.id, existing.teamId, ['owner', 'manager']);
    await this.connectors.delete(id);
    return { ok: true };
  }

  // helpers
  private validateScope(dto: CreateConnectorDto) {
    if (dto.scope === 'project' && !dto.projectId) throw new BadRequestException('projectId required for project scope');
    if (dto.scope === 'team' && dto.projectId) throw new BadRequestException('projectId must be null for team scope');
  }
  private validateBaseUrlForProvider(dto: CreateConnectorDto) {
    const cap = PROVIDER_CAPABILITIES[dto.provider as ProviderType];
    if (cap?.requiresBaseUrl && !dto.baseUrl) throw new BadRequestException(`${dto.provider} requires baseUrl`);
  }
  private async assertTeamMember(userId: string, teamId: string) {
    const m = await this.memberships.findByUserAndTeam(userId, teamId);
    if (!m) throw new ForbiddenException();
  }
  private async assertTeamRole(userId: string, teamId: string, roles: string[]) {
    const m = await this.memberships.findByUserAndTeam(userId, teamId);
    if (!m || !roles.includes(m.role)) throw new ForbiddenException();
  }
  private maskRow = (row: any) => ({ ...row, apiKey: undefined, keyHint: maskApiKey(row.apiKey) });
}
```

If `MembershipRepository.findByUserAndTeam` / `CurrentUser` decorator don't exist exactly as written, grep for an existing controller that does role checks (e.g. team / project controllers) and mirror its pattern.

- [ ] **Step 3: Wire controller into AiModule providers/controllers list**

In `packages/server/src/ai/ai.module.ts`, add `AiConnectorsController` to `controllers: []`. Make sure `MembershipRepository` is available (import from the relevant module or add to the providers if needed).

- [ ] **Step 4: Write e2e test**

`packages/server/test/ai-connectors.e2e-spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AiConnectors (e2e)', () => {
  let app: INestApplication;
  let ownerToken: string;
  let memberToken: string;
  let teamId: string;
  let projectId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    ({ ownerToken, memberToken, teamId, projectId } = await seedUsers(app));  // reuse fixtures from existing e2e tests
  });
  afterAll(() => app.close());

  it('owner creates a team-scoped connector', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/ai/connectors')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ scope: 'team', teamId, displayName: 'OpenAI', provider: 'openai', apiKey: 'sk-test', enabledModels: [{ modelId: 'gpt-5.5', addedManually: false }] })
      .expect(201);
    expect(res.body.keyHint).toMatch(/test$/);
    expect(res.body.apiKey).toBeUndefined();
  });

  it('member cannot create', async () => {
    await request(app.getHttpServer())
      .post('/api/ai/connectors')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ scope: 'team', teamId, displayName: 'X', provider: 'openai', apiKey: 'sk-test', enabledModels: [] })
      .expect(403);
  });

  it('rejects openai-compatible without baseUrl', async () => {
    await request(app.getHttpServer())
      .post('/api/ai/connectors')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ scope: 'team', teamId, displayName: 'X', provider: 'openai-compatible', apiKey: 'sk-test', enabledModels: [] })
      .expect(400);
  });

  it('lists project connectors (inherited team + own)', async () => {
    await request(app.getHttpServer())
      .post('/api/ai/connectors')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ scope: 'project', teamId, projectId, displayName: 'P', provider: 'claude', apiKey: 'sk-ant-x', enabledModels: [] })
      .expect(201);
    const res = await request(app.getHttpServer())
      .get(`/api/ai/connectors?projectId=${projectId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });
});

// reuse the existing e2e seed helpers — grep test/ for "seedUsers" or similar
declare function seedUsers(app: INestApplication): Promise<any>;
```

If `seedUsers` doesn't exist by that name, look at `packages/server/test/*.e2e-spec.ts` for an existing fixture builder and copy its bootstrap (likely calls auth endpoints to obtain tokens).

- [ ] **Step 5: Run e2e**

```
pnpm --filter @transweave/server test:e2e -- --testPathPattern=ai-connectors
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/server/src/ai/ai-connectors.controller.ts \
        packages/server/src/ai/dto/ai-connector.dto.ts \
        packages/server/src/ai/ai.module.ts \
        packages/server/test/ai-connectors.e2e-spec.ts
git commit -m "feat(api): AI connectors CRUD endpoints with role-based authorization"
```

---

### Task 13: Defaults endpoints

**Files:**
- Create: `packages/server/src/ai/ai-defaults.controller.ts`
- Modify: `packages/server/src/ai/ai.module.ts`

- [ ] **Step 1: Controller**

`packages/server/src/ai/ai-defaults.controller.ts`:

```ts
import { Body, Controller, Get, Param, Put, Query, UseGuards, BadRequestException, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '../jwt/guard';
import { IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';
import { ConnectorResolver } from './connector-resolver.service';
import { TeamRepository } from '../repository/team.repository';
import { ProjectRepository } from '../repository/project.repository';
import { MembershipRepository } from '../repository/membership.repository';
import { AiConnectorRepository } from '../repository/ai-connector.repository';
import { maskApiKey } from './encryption.util';
import { PROVIDER_CAPABILITIES } from './providers/capabilities';
import type { ProviderType } from './providers/translation-provider.interface';
import { CurrentUser, UserPayload } from '../jwt/current-user.decorator';

class SetDefaultDto {
  @ValidateIf((o) => o.connectorId !== null) @IsUUID() @IsOptional() connectorId!: string | null;
  @ValidateIf((o) => o.model !== null) @IsString() @IsOptional() model!: string | null;
}

@Controller('api/ai/defaults')
@UseGuards(AuthGuard)
export class AiDefaultsController {
  constructor(
    private readonly teams: TeamRepository,
    private readonly projects: ProjectRepository,
    private readonly memberships: MembershipRepository,
    private readonly connectors: AiConnectorRepository,
    private readonly resolver: ConnectorResolver,
  ) {}

  @Put('team/:teamId')
  async setTeam(@Param('teamId') teamId: string, @Body() dto: SetDefaultDto, @CurrentUser() user: UserPayload) {
    await this.assertOwnerOrManager(user.id, teamId);
    if (dto.connectorId) {
      const c = await this.connectors.findById(dto.connectorId);
      if (!c || c.teamId !== teamId || c.scope !== 'team') throw new BadRequestException('connector not in this team');
    }
    await this.teams.update(teamId, { defaultConnectorId: dto.connectorId, defaultModel: dto.model } as any);
    return { ok: true };
  }

  @Put('project/:projectId')
  async setProject(@Param('projectId') projectId: string, @Body() dto: SetDefaultDto, @CurrentUser() user: UserPayload) {
    const project = await this.projects.findById(projectId);
    if (!project) throw new BadRequestException('project not found');
    await this.assertOwnerOrManager(user.id, project.teamId);
    if (dto.connectorId) {
      const c = await this.connectors.findById(dto.connectorId);
      if (!c || c.teamId !== project.teamId) throw new BadRequestException('connector not in this project\'s team');
    }
    await this.projects.update(projectId, { defaultConnectorId: dto.connectorId, defaultModel: dto.model } as any);
    return { ok: true };
  }

  @Get('resolve')
  async resolve(@Query('projectId') projectId: string, @CurrentUser() user: UserPayload) {
    if (!projectId) throw new BadRequestException('projectId required');
    const project = await this.projects.findById(projectId);
    if (!project) throw new BadRequestException();
    await this.assertMember(user.id, project.teamId);
    try {
      const r = await this.resolver.resolve(projectId);
      const cap = PROVIDER_CAPABILITIES[r.connector.provider as ProviderType];
      return {
        configured: true,
        connectorId: r.connector.id,
        displayName: r.connector.displayName,
        provider: r.connector.provider,
        model: r.model,
        source: r.source,
        toolCalling: !!cap?.toolCalling,
        keyHint: maskApiKey(r.connector.apiKey),
      };
    } catch {
      return { configured: false };
    }
  }

  private async assertMember(userId: string, teamId: string) {
    const m = await this.memberships.findByUserAndTeam(userId, teamId);
    if (!m) throw new ForbiddenException();
  }
  private async assertOwnerOrManager(userId: string, teamId: string) {
    const m = await this.memberships.findByUserAndTeam(userId, teamId);
    if (!m || !['owner', 'manager'].includes(m.role)) throw new ForbiddenException();
  }
}
```

- [ ] **Step 2: Register controller in module**

Add `AiDefaultsController` to `controllers` in `ai.module.ts`.

- [ ] **Step 3: Smoke-test via curl**

```
pnpm --filter @transweave/server start:dev
# in another shell, with a valid bearer token for a seeded owner:
curl -s -H "Authorization: Bearer $TOKEN" 'http://localhost:3001/api/ai/defaults/resolve?projectId=…' | jq
```
Expected: `{"configured": false}` if nothing's set; valid payload otherwise.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/ai/ai-defaults.controller.ts \
        packages/server/src/ai/ai.module.ts
git commit -m "feat(api): defaults endpoints for team/project + resolve"
```

---

### Task 14: list-models / probe-models endpoints

**Files:**
- Modify: `packages/server/src/ai/ai-connectors.controller.ts`
- Modify: `packages/server/src/ai/ai-config.service.ts` (reuse existing `listModels`)

- [ ] **Step 1: Add `/list-models` and `/probe-models` routes**

In `ai-connectors.controller.ts` add:

```ts
import { decryptApiKey } from './encryption.util';
import { createTranslationProvider, isLLMProvider } from './providers/provider-factory';
import { PROVIDER_CAPABILITIES } from './providers/capabilities';

  @Post(':id/list-models')
  async listExisting(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    const c = await this.connectors.findById(id);
    if (!c) throw new NotFoundException();
    await this.assertTeamMember(user.id, c.teamId);
    const cap = PROVIDER_CAPABILITIES[c.provider as ProviderType];
    if (!cap?.listModels) return { models: cap?.recommendedModels ?? [], source: 'recommended' };
    const provider = createTranslationProvider({
      provider: c.provider as any,
      apiKey: decryptApiKey(c.apiKey),
      baseUrl: c.baseUrl ?? undefined,
    });
    const models = provider.listModels ? await provider.listModels() : [];
    return { models, source: 'upstream' };
  }

  @Post('probe-models')
  async probe(
    @Body() body: { provider: string; apiKey: string; baseUrl?: string },
    @CurrentUser() user: UserPayload,
  ) {
    if (!isLLMProvider(body.provider)) return { models: [], source: 'static' };
    const cap = PROVIDER_CAPABILITIES[body.provider as ProviderType];
    if (!cap.listModels) return { models: cap.recommendedModels, source: 'recommended' };
    const provider = createTranslationProvider({
      provider: body.provider as any,
      apiKey: body.apiKey,
      baseUrl: body.baseUrl,
    });
    const models = provider.listModels ? await provider.listModels() : [];
    return { models, source: 'upstream' };
  }
```

(Both endpoints return raw upstream output; no client-side deny-list filtering, per spec §5.2.)

- [ ] **Step 2: Smoke-test**

```
curl -s -H "Authorization: Bearer $TOKEN" -X POST http://localhost:3001/api/ai/connectors/probe-models \
  -H 'Content-Type: application/json' \
  -d '{"provider":"openai","apiKey":"sk-…"}'
```
Expected: `{"models":["gpt-…", ...], "source":"upstream"}` with a real key, or an HTTP 4xx on bad key.

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/ai/ai-connectors.controller.ts
git commit -m "feat(api): list-models and probe-models endpoints"
```

---

### Task 15: Backward-compat shim on legacy `/api/ai/config`

**Files:**
- Modify: `packages/server/src/ai/ai-config.service.ts` — change behavior of `setTeamConfig` / `setProjectConfig` to upsert a `displayName='Default'` connector and set default; keep `removeXxxConfig` to clear default.

- [ ] **Step 1: Replace `setTeamConfig` body with upsert semantics**

```ts
async setTeamConfig(teamId: string, config: AiConfigDto): Promise<void> {
  // validate via the existing path (probe key)
  await this.validateAndEncrypt(config);   // throws if invalid; the encrypted form is recomputed below
  const encrypted = encryptApiKey(config.apiKey);

  const all = await this.connectorRepo.listForTeam(teamId);
  let target = all.find((c) => c.displayName === 'Default');
  if (target) {
    target = (await this.connectorRepo.update(target.id, {
      provider: config.provider,
      apiKey: encrypted,
      baseUrl: config.baseUrl ?? null,
      enabledModels: this.upsertModel(target.enabledModels, config.model),
    } as any))!;
  } else {
    target = await this.connectorRepo.create({
      scope: 'team', teamId, projectId: null,
      displayName: 'Default', provider: config.provider,
      apiKey: encrypted, baseUrl: config.baseUrl ?? null,
      enabledModels: config.model ? [{ modelId: config.model, addedManually: true }] : [],
    } as any);
  }
  await this.teamRepository.update(teamId, {
    defaultConnectorId: target.id,
    defaultModel: config.model ?? null,
  } as any);
}

private upsertModel(list: any[], model?: string) {
  if (!model) return list;
  if (list.some((m) => m.modelId === model)) return list;
  return [...list, { modelId: model, addedManually: true }];
}
```

Mirror for `setProjectConfig` (with `scope: 'project'`, `projectId`).

`removeTeamConfig` / `removeProjectConfig` become:

```ts
async removeTeamConfig(teamId: string) {
  await this.teamRepository.update(teamId, { defaultConnectorId: null, defaultModel: null } as any);
}
async removeProjectConfig(projectId: string) {
  await this.projectRepository.update(projectId, { defaultConnectorId: null, defaultModel: null } as any);
}
```

`getTeamConfig` / `getProjectConfig` should now derive from default connector. Read the project/team row, then look up its `defaultConnectorId` via the repo:

```ts
async getTeamConfig(teamId: string): Promise<AiConfigStored | null> {
  const team = await this.teamRepository.findById(teamId);
  if (!team?.defaultConnectorId) return null;
  const c = await this.connectorRepo.findById(team.defaultConnectorId);
  if (!c) return null;
  return { provider: c.provider as any, apiKey: c.apiKey, model: team.defaultModel ?? undefined, baseUrl: c.baseUrl ?? undefined };
}
```

Add `AiConnectorRepository` to the service's constructor.

- [ ] **Step 2: Run all server tests**

```
pnpm --filter @transweave/server test
```
Expected: PASS. Update any `ai-config.service.spec.ts` to reflect the new internal collaboration (stub the repo).

- [ ] **Step 3: Smoke-test backward compat**

```
curl -X PUT 'http://localhost:3001/api/ai/config/team/<teamId>' \
  -H 'Authorization: Bearer $TOKEN' -H 'Content-Type: application/json' \
  -d '{"provider":"openai","apiKey":"sk-…","model":"gpt-5.5"}'
curl 'http://localhost:3001/api/ai/connectors?teamId=<teamId>' -H 'Authorization: Bearer $TOKEN'
```
Expected: list contains a Default connector matching the upsert.

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/ai/ai-config.service.ts
git commit -m "refactor(ai): legacy /api/ai/config upserts a Default connector"
```

---

## Phase F: Web UI

### Task 16: API client for connectors

**Files:**
- Create: `packages/web/api/connectors.ts`

- [ ] **Step 1: Write the client**

`packages/web/api/connectors.ts`:

```ts
import axios from 'axios';

export type EnabledModel = { modelId: string; label?: string; addedManually: boolean };
export type Connector = {
  id: string;
  scope: 'team' | 'project';
  teamId: string;
  projectId: string | null;
  displayName: string;
  provider: string;
  keyHint: string;
  baseUrl: string | null;
  enabledModels: EnabledModel[];
  createdAt: string;
  updatedAt: string;
};

export const listConnectors = async (params: { teamId?: string; projectId?: string }) =>
  (await axios.get<Connector[]>('/api/ai/connectors', { params })).data;

export const createConnector = async (body: {
  scope: 'team' | 'project'; teamId: string; projectId?: string;
  displayName: string; provider: string; apiKey: string; baseUrl?: string;
  enabledModels: EnabledModel[];
}) => (await axios.post<Connector>('/api/ai/connectors', body)).data;

export const updateConnector = async (
  id: string,
  body: Partial<Pick<Connector, 'displayName' | 'baseUrl' | 'enabledModels'>> & { apiKey?: string },
) => (await axios.patch<Connector>(`/api/ai/connectors/${id}`, body)).data;

export const deleteConnector = async (id: string) =>
  (await axios.delete(`/api/ai/connectors/${id}`)).data;

export const listModelsForConnector = async (id: string) =>
  (await axios.post<{ models: string[]; source: string }>(`/api/ai/connectors/${id}/list-models`)).data;

export const probeModels = async (body: { provider: string; apiKey: string; baseUrl?: string }) =>
  (await axios.post<{ models: string[]; source: string }>('/api/ai/connectors/probe-models', body)).data;

export type ResolvedDefault = {
  configured: boolean;
  connectorId?: string;
  displayName?: string;
  provider?: string;
  model?: string;
  source?: 'project' | 'team';
  toolCalling?: boolean;
  keyHint?: string;
};

export const resolveDefault = async (projectId: string) =>
  (await axios.get<ResolvedDefault>('/api/ai/defaults/resolve', { params: { projectId } })).data;

export const setTeamDefault = async (teamId: string, body: { connectorId: string | null; model: string | null }) =>
  (await axios.put(`/api/ai/defaults/team/${teamId}`, body)).data;

export const setProjectDefault = async (projectId: string, body: { connectorId: string | null; model: string | null }) =>
  (await axios.put(`/api/ai/defaults/project/${projectId}`, body)).data;
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/api/connectors.ts
git commit -m "feat(web): API client for AI connectors"
```

---

### Task 17: Settings page master/detail UI

**Files:**
- Create: `packages/web/components/views/settings/AiConnectorsSettings.tsx`
- Modify: the settings page that currently renders `AiProviderSettings` to render the new component instead (look in `packages/web/components/views/settings/index.tsx` or the calling page in `app/`).

- [ ] **Step 1: Component scaffolding**

`packages/web/components/views/settings/AiConnectorsSettings.tsx`:

```tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Trash2, RefreshCw, Save } from "lucide-react";
import { listConnectors, createConnector, updateConnector, deleteConnector, listModelsForConnector, probeModels, resolveDefault, setTeamDefault, setProjectDefault, type Connector, type EnabledModel } from "@/api/connectors";

type Scope = { kind: "team"; teamId: string } | { kind: "project"; teamId: string; projectId: string };

const PROVIDERS = [
  { value: "openai", label: "OpenAI", requiresBaseUrl: false },
  { value: "claude", label: "Claude", requiresBaseUrl: false },
  { value: "deepseek", label: "DeepSeek", requiresBaseUrl: false },
  { value: "gemini", label: "Gemini", requiresBaseUrl: false },
  { value: "openai-compatible", label: "OpenAI-Compatible", requiresBaseUrl: true },
  { value: "deepl", label: "DeepL", requiresBaseUrl: false },
  { value: "google-translate", label: "Google Translate", requiresBaseUrl: false },
];

export function AiConnectorsSettings({ scope }: { scope: Scope }) {
  const t = useTranslations("aiConnectors");
  const { toast } = useToast();
  const [items, setItems] = useState<Connector[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Connector> & { apiKeyInput?: string } | null>(null);
  const [defaultInfo, setDefaultInfo] = useState<{ connectorId?: string; model?: string } | null>(null);

  useEffect(() => { void reload(); }, [scope]);

  async function reload() {
    const list = await listConnectors(scope.kind === "team" ? { teamId: scope.teamId } : { projectId: scope.projectId });
    setItems(list);
    if (scope.kind === "project") {
      const r = await resolveDefault(scope.projectId);
      setDefaultInfo(r.configured ? { connectorId: r.connectorId, model: r.model } : null);
    }
  }

  const selected = useMemo(() => items.find((c) => c.id === selectedId) ?? null, [items, selectedId]);

  function startAdd() {
    setSelectedId(null);
    setDraft({
      scope: scope.kind, teamId: scope.teamId, projectId: scope.kind === "project" ? scope.projectId : null,
      displayName: "", provider: "openai", baseUrl: null, enabledModels: [], apiKeyInput: "",
    });
  }

  async function probe() {
    if (!draft) return;
    try {
      const res = await probeModels({ provider: draft.provider!, apiKey: draft.apiKeyInput!, baseUrl: draft.baseUrl ?? undefined });
      setDraft({ ...draft, enabledModels: res.models.map((m) => ({ modelId: m, addedManually: false })) });
    } catch (e: any) {
      toast({ title: t("probeFailed"), description: e?.response?.data?.message ?? String(e), variant: "destructive" });
    }
  }

  async function save() {
    if (!draft) return;
    try {
      if (selected) {
        await updateConnector(selected.id, {
          displayName: draft.displayName, baseUrl: draft.baseUrl ?? undefined,
          enabledModels: draft.enabledModels, apiKey: draft.apiKeyInput || undefined,
        });
      } else {
        await createConnector({
          scope: scope.kind, teamId: scope.teamId, projectId: scope.kind === "project" ? scope.projectId : undefined,
          displayName: draft.displayName!, provider: draft.provider!,
          apiKey: draft.apiKeyInput!, baseUrl: draft.baseUrl ?? undefined,
          enabledModels: draft.enabledModels ?? [],
        });
      }
      setDraft(null);
      await reload();
      toast({ title: t("saved") });
    } catch (e: any) {
      toast({ title: t("saveFailed"), description: e?.response?.data?.message ?? String(e), variant: "destructive" });
    }
  }

  async function remove(id: string) {
    if (!confirm(t("removeConfirm"))) return;
    await deleteConnector(id);
    if (selectedId === id) setSelectedId(null);
    await reload();
  }

  async function setAsDefault(connectorId: string, modelId: string) {
    if (scope.kind === "team") await setTeamDefault(scope.teamId, { connectorId, model: modelId });
    else await setProjectDefault(scope.projectId, { connectorId, model: modelId });
    await reload();
  }

  return (
    <div className="grid grid-cols-[260px_1fr] gap-4 min-h-[480px]">
      <aside className="border-r pr-3">
        <ul className="space-y-1">
          {items.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => { setSelectedId(c.id); setDraft({ ...c, apiKeyInput: "" }); }}
                className={`w-full text-left px-2 py-1.5 rounded text-sm ${selectedId === c.id ? "bg-accent" : "hover:bg-accent/50"}`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{c.displayName}</span>
                  {c.scope === "team" && scope.kind === "project" && <Badge variant="outline" className="text-[10px]">team</Badge>}
                  {defaultInfo?.connectorId === c.id && <Badge className="text-[10px]">default</Badge>}
                </div>
                <div className="text-xs opacity-60">{c.provider} · {c.enabledModels.length} models</div>
              </button>
            </li>
          ))}
          <li>
            <button onClick={startAdd} className="w-full text-left px-2 py-1.5 rounded text-sm text-primary hover:bg-accent/50">
              <Plus className="inline w-3.5 h-3.5 mr-1" /> {t("addConnector")}
            </button>
          </li>
        </ul>
      </aside>

      <section>
        {draft ? (
          <div className="space-y-3 max-w-xl">
            <h3 className="text-lg font-semibold">{selected ? t("edit") : t("addConnector")}</h3>

            <div>
              <Label>{t("displayName")}</Label>
              <Input value={draft.displayName ?? ""} onChange={(e) => setDraft({ ...draft, displayName: e.target.value })} />
            </div>

            <div>
              <Label>{t("provider")}</Label>
              <Select
                value={draft.provider}
                onValueChange={(v) => setDraft({ ...draft, provider: v, baseUrl: PROVIDERS.find((p) => p.value === v)?.requiresBaseUrl ? "" : null })}
                disabled={!!selected}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t("apiKey")} {selected && <span className="text-xs opacity-60">({t("keepBlankUnchanged")})</span>}</Label>
              <Input
                type="password"
                value={draft.apiKeyInput ?? ""}
                onChange={(e) => setDraft({ ...draft, apiKeyInput: e.target.value })}
                placeholder={selected ? selected.keyHint : ""}
              />
            </div>

            {PROVIDERS.find((p) => p.value === draft.provider)?.requiresBaseUrl && (
              <div>
                <Label>{t("baseUrl")}</Label>
                <Input value={draft.baseUrl ?? ""} onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })} placeholder="https://…/v1" />
              </div>
            )}

            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={probe}><RefreshCw className="w-4 h-4 mr-1" /> {t("fetchModels")}</Button>
              <span className="text-xs opacity-60">{(draft.enabledModels ?? []).length} {t("modelsSelected")}</span>
            </div>

            <div className="space-y-1 max-h-48 overflow-auto border rounded p-2">
              {(draft.enabledModels ?? []).map((m, i) => (
                <div key={m.modelId} className="flex justify-between text-sm">
                  <span>{m.modelId}</span>
                  <button onClick={() => setDraft({ ...draft, enabledModels: draft.enabledModels!.filter((_, j) => j !== i) })}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <AddManuallyRow onAdd={(id) => setDraft({ ...draft, enabledModels: [...(draft.enabledModels ?? []), { modelId: id, addedManually: true }] })} />
            </div>

            <div className="flex gap-2">
              <Button onClick={save}><Save className="w-4 h-4 mr-1" /> {t("save")}</Button>
              <Button variant="ghost" onClick={() => setDraft(null)}>{t("cancel")}</Button>
              {selected && (
                <Button variant="destructive" className="ml-auto" onClick={() => remove(selected.id)}>
                  <Trash2 className="w-4 h-4 mr-1" /> {t("delete")}
                </Button>
              )}
            </div>

            {selected && (selected.enabledModels.length > 0) && (
              <div className="pt-2 border-t">
                <Label className="text-xs uppercase opacity-60">{t("setAsDefault")}</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selected.enabledModels.map((m) => (
                    <button key={m.modelId} onClick={() => setAsDefault(selected.id, m.modelId)} className="text-xs px-2 py-1 rounded border hover:bg-accent">
                      {m.modelId}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm opacity-60 flex items-center justify-center h-full">{t("selectOrAdd")}</div>
        )}
      </section>
    </div>
  );
}

function AddManuallyRow({ onAdd }: { onAdd: (id: string) => void }) {
  const t = useTranslations("aiConnectors");
  const [v, setV] = useState("");
  return (
    <div className="flex gap-1 mt-2">
      <Input className="h-7 text-xs" placeholder={t("addManuallyPlaceholder")} value={v} onChange={(e) => setV(e.target.value)} />
      <Button size="sm" variant="outline" onClick={() => { if (v.trim()) { onAdd(v.trim()); setV(""); } }}>{t("add")}</Button>
    </div>
  );
}
```

- [ ] **Step 2: Replace existing AI settings entry point**

Search where `AiProviderSettings` is imported and rendered:

```bash
grep -rn "AiProviderSettings" packages/web
```

In those parent pages (likely `team/[id]/settings/page.tsx` and `project/[id]/settings/page.tsx`), import and render `AiConnectorsSettings` with the right scope:

```tsx
// team settings page
import { AiConnectorsSettings } from "@/components/views/settings/AiConnectorsSettings";
// ...
<AiConnectorsSettings scope={{ kind: "team", teamId: params.id }} />
```

```tsx
// project settings page
<AiConnectorsSettings scope={{ kind: "project", teamId: project.teamId, projectId: project.id }} />
```

Keep `AiProviderSettings.tsx` file as-is (still loaded by old code paths if any); we'll delete it in Phase G after confirming nothing references it.

- [ ] **Step 3: Run web dev server, sanity-check**

```
pnpm dev:web
```
Open `http://localhost:3000/team/<id>/settings` → AI tab. Add a connector, fetch models, save. Repeat at project level. Set as default. Verify the right side panel UI matches the spec §7.

- [ ] **Step 4: Commit**

```bash
git add packages/web/components/views/settings/AiConnectorsSettings.tsx \
        # whichever settings pages you wired:
        packages/web/app/team/[teamId]/settings/page.tsx \
        packages/web/app/project/[projectId]/settings/page.tsx
git commit -m "feat(web): AI connectors settings (master/detail)"
```

---

### Task 18: AgentChat model chip

**Files:**
- Modify: `packages/web/components/views/projectView/AgentChat/index.tsx`
- Modify: `packages/web/api/agent.ts` (or wherever `agentChat` client is)

- [ ] **Step 1: Add chip selector at top of chat panel**

Open `AgentChat/index.tsx`. Inside the component, fetch the current resolved default once:

```tsx
import { useEffect, useState } from "react";
import { resolveDefault, listConnectors, type ResolvedDefault, setProjectDefault, type Connector } from "@/api/connectors";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ChevronDown } from "lucide-react";

const [resolved, setResolved] = useState<ResolvedDefault | null>(null);
const [allConnectors, setAllConnectors] = useState<Connector[]>([]);
const [selection, setSelection] = useState<{ connectorId: string; model: string } | null>(null);

useEffect(() => {
  void (async () => {
    setResolved(await resolveDefault(projectId));
    setAllConnectors(await listConnectors({ projectId }));
  })();
}, [projectId]);

useEffect(() => {
  if (resolved?.configured && !selection) {
    setSelection({ connectorId: resolved.connectorId!, model: resolved.model! });
  }
}, [resolved, selection]);
```

Render the chip above the input area. Replace the existing `if (!aiConfigured) return null` block with something that uses the resolved info:

```tsx
if (!resolved?.configured) return null;

// in the JSX, near the top of the panel:
<div className="px-3 py-2 border-b flex items-center gap-2 text-xs">
  <span className="opacity-60">Model:</span>
  <Popover>
    <PopoverTrigger className="px-2 py-0.5 rounded-full border hover:bg-accent flex items-center gap-1">
      <span>{selection?.connectorId && allConnectors.find((c) => c.id === selection.connectorId)?.displayName} · {selection?.model}</span>
      <ChevronDown className="w-3 h-3" />
    </PopoverTrigger>
    <PopoverContent className="w-80 p-2">
      {allConnectors
        .filter((c) => ["openai", "claude", "deepseek", "gemini", "openai-compatible"].includes(c.provider))
        .map((c) => (
          <div key={c.id} className="mb-2">
            <div className="text-[10px] uppercase opacity-60 mb-1 flex items-center gap-1">
              {c.displayName} {c.scope === "team" && <Badge variant="outline" className="text-[9px]">team</Badge>}
            </div>
            {c.enabledModels.map((m) => (
              <button
                key={m.modelId}
                onClick={() => setSelection({ connectorId: c.id, model: m.modelId })}
                className={`w-full text-left px-2 py-1 text-sm rounded ${selection?.connectorId === c.id && selection?.model === m.modelId ? "bg-accent" : "hover:bg-accent/50"}`}
              >
                {m.modelId}
              </button>
            ))}
          </div>
        ))}
      <button
        onClick={() => selection && setProjectDefault(projectId, selection).then(() => resolveDefault(projectId)).then(setResolved)}
        className="w-full mt-2 text-xs text-primary"
      >
        Set as project default
      </button>
    </PopoverContent>
  </Popover>
</div>
```

- [ ] **Step 2: Pass selection through to agentChat client call**

Find `await agentChat(text, projectId, history.slice(0, -1), (event) => ...)` and update the client to accept and pass `connectorId` + `model`:

In `packages/web/api/agent.ts` (or equivalent), change the signature:

```ts
export async function agentChat(
  message: string,
  projectId: string,
  history: AgentMessage[],
  options: { connectorId?: string; model?: string },
  onEvent: (e: AgentEvent) => void,
) { /* ...existing body, add connectorId/model into the POST body... */ }
```

In `AgentChat/index.tsx` update the call:

```ts
await agentChat(text, projectId, history.slice(0, -1), selection ?? {}, onEvent);
```

- [ ] **Step 3: Smoke test in browser**

`pnpm dev:web` + `pnpm dev:server`. Open a project's token tab → AgentChat panel. Chip shows current model. Click → popover lists team + project connectors with enabled models. Select a different one, send a message. Verify request payload in DevTools network tab includes `connectorId` + `model`.

- [ ] **Step 4: Commit**

```bash
git add packages/web/components/views/projectView/AgentChat/index.tsx \
        packages/web/api/agent.ts
git commit -m "feat(web): AgentChat top model selector chip"
```

---

### Task 19: i18n keys

**Files:**
- Modify: `packages/web/i18n/zh-CN.json`
- Modify: `packages/web/i18n/en-US.json`

- [ ] **Step 1: Add namespace block to both files**

Add this object (under top level) to `zh-CN.json`:

```json
"aiConnectors": {
  "title": "AI 连接器",
  "addConnector": "添加连接器",
  "edit": "编辑",
  "displayName": "名称",
  "provider": "厂商",
  "apiKey": "API Key",
  "keepBlankUnchanged": "留空则不修改",
  "baseUrl": "Base URL",
  "fetchModels": "拉取模型",
  "modelsSelected": "个模型已启用",
  "addManually": "手动添加",
  "addManuallyPlaceholder": "输入 model id",
  "add": "添加",
  "save": "保存",
  "cancel": "取消",
  "delete": "删除",
  "removeConfirm": "删除该连接器？该操作不可撤销。",
  "saved": "已保存",
  "saveFailed": "保存失败",
  "probeFailed": "模型探测失败",
  "selectOrAdd": "从左侧选择或新增连接器",
  "setAsDefault": "设为默认",
  "inheritedFromTeam": "团队共享"
}
```

Add the corresponding English keys to `en-US.json`:

```json
"aiConnectors": {
  "title": "AI Connectors",
  "addConnector": "Add connector",
  "edit": "Edit",
  "displayName": "Display name",
  "provider": "Provider",
  "apiKey": "API key",
  "keepBlankUnchanged": "leave blank to keep unchanged",
  "baseUrl": "Base URL",
  "fetchModels": "Fetch models",
  "modelsSelected": "models enabled",
  "addManually": "Add manually",
  "addManuallyPlaceholder": "Enter model id",
  "add": "Add",
  "save": "Save",
  "cancel": "Cancel",
  "delete": "Delete",
  "removeConfirm": "Remove this connector? This cannot be undone.",
  "saved": "Saved",
  "saveFailed": "Save failed",
  "probeFailed": "Failed to probe models",
  "selectOrAdd": "Select a connector on the left, or add a new one",
  "setAsDefault": "Set as default",
  "inheritedFromTeam": "Shared from team"
}
```

- [ ] **Step 2: Run i18n lint**

```
pnpm --filter @transweave/web i18n
```
Expected: PASS (keys are aligned between locales).

- [ ] **Step 3: Commit**

```bash
git add packages/web/i18n/zh-CN.json packages/web/i18n/en-US.json
git commit -m "feat(web): i18n keys for aiConnectors namespace"
```

---

## Phase G: Cleanup + verification

### Task 20: Final integration test for legacy compat

**Files:**
- Create: `packages/server/test/ai-config-compat.e2e-spec.ts`

- [ ] **Step 1: Write the e2e**

```ts
// PUT /api/ai/config/team/:id should now upsert a Default connector
// without deleting other connectors.
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AI legacy config compat (e2e)', () => {
  let app: INestApplication;
  let ownerToken: string;
  let teamId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    ({ ownerToken, teamId } = await seedUsers(app));   // reuse fixture from Task 12
  });
  afterAll(() => app.close());

  it('PUT /api/ai/config/team/:id upserts Default and preserves siblings', async () => {
    // 1. add a sibling connector via new API
    await request(app.getHttpServer())
      .post('/api/ai/connectors')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ scope: 'team', teamId, displayName: 'Sibling', provider: 'claude', apiKey: 'sk-ant-x', enabledModels: [] })
      .expect(201);

    // 2. legacy PUT
    await request(app.getHttpServer())
      .put(`/api/ai/config/team/${teamId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ provider: 'openai', apiKey: 'sk-test', model: 'gpt-5.5' })
      .expect(200);

    // 3. assert: 2 connectors total, Default exists, Sibling preserved
    const res = await request(app.getHttpServer())
      .get(`/api/ai/connectors?teamId=${teamId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    const names = res.body.map((c: any) => c.displayName).sort();
    expect(names).toEqual(['Default', 'Sibling']);
  });
});

declare function seedUsers(app: INestApplication): Promise<any>;
```

- [ ] **Step 2: Run e2e**

```
pnpm --filter @transweave/server test:e2e -- --testPathPattern=ai-config-compat
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add packages/server/test/ai-config-compat.e2e-spec.ts
git commit -m "test(api): verify legacy ai/config endpoint upserts without deleting siblings"
```

---

### Task 21: Delete the old `AiProviderSettings.tsx`

**Files:**
- Delete: `packages/web/components/views/settings/AiProviderSettings.tsx`

- [ ] **Step 1: Verify no remaining references**

```
grep -rn "AiProviderSettings" packages/web
```
Expected: empty (or only the file itself).

- [ ] **Step 2: Delete and build**

```bash
git rm packages/web/components/views/settings/AiProviderSettings.tsx
pnpm --filter @transweave/web build
```
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git commit -m "chore(web): remove obsolete AiProviderSettings component"
```

---

### Task 22: Full test + build sweep

- [ ] **Step 1: Run all server tests**

```
pnpm --filter @transweave/server test
pnpm --filter @transweave/server test:e2e
```
Expected: all PASS.

- [ ] **Step 2: Run all web checks**

```
pnpm --filter @transweave/web lint
pnpm --filter @transweave/web build
```
Expected: PASS.

- [ ] **Step 3: Manual smoke test**

1. Wipe local PGlite: `rm -rf packages/server/data/pglite`
2. Restart `pnpm dev:server` + `pnpm dev:web`
3. Setup admin via `/setup`
4. Create a team + project
5. Set legacy aiConfig via legacy endpoint (curl), restart server, verify migration created a Default connector
6. Add a second connector via settings UI
7. In AgentChat, switch model chip, send a translation, verify model used

- [ ] **Step 4: Commit (if any incidental fixes)**

No commit needed if no changes — the previous tasks should leave the tree green.

---

## Notes for engineers

- **PGlite quirk**: every migration statement needs `--> statement-breakpoint` between SQL statements. Drizzle-kit emits them; if you hand-edit, preserve them.
- **Membership lookup pattern**: the codebase already has patterns for checking team membership in other controllers. Find one (e.g. team controller's route guards) and reuse — don't invent a new pattern.
- **CurrentUser decorator**: confirm the exact import path; the codebase uses Passport JWT so the user is on `request.user`. If no decorator exists, use `@Req() req` and read `req.user`.
- **Encryption**: `encryptApiKey` requires `AI_ENCRYPTION_KEY` env var; tests that exercise create paths must set it.
- **Backward compat window**: the legacy `aiConfig` column stays for one release. A future migration `0014` will drop it after we verify rollouts are stable.
- **Model id refresh**: `PROVIDER_CAPABILITIES` in `capabilities.ts` is the single source of truth. Add a line to the release checklist: "verify capabilities.ts against vendor docs".
