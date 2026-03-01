# Architecture Research

**Domain:** Open-source i18n management platform (NestJS + Next.js monorepo converting from MongoDB to SQLite/PostgreSQL)
**Researched:** 2026-03-01
**Confidence:** MEDIUM

## Standard Architecture

### System Overview

```
                            +--------------------------+
                            |     Docker Compose       |
                            +--------------------------+
                                        |
         +------------------------------+------------------------------+
         |                              |                              |
+--------v---------+       +-----------v-----------+       +----------v----------+
|   web (Next.js)  |       |  server (NestJS)      |       |   db (PostgreSQL    |
|   Port 3000      |------>|  Port 3001            |------>|   or SQLite file)   |
|                  |       |                       |       |                     |
|  Static assets   |       |  +------------------+ |       +---------------------+
|  SSR pages       |       |  | Controller Layer | |
|  API client      |       |  +--------+---------+ |       +---------------------+
|                  |       |           |           |       |   uploads/          |
+------------------+       |  +--------v---------+ |       |   (local volume)    |
                           |  | Service Layer    | |       +---------------------+
                           |  +--------+---------+ |
                           |           |           |
                           |  +--------v---------+ |
                           |  | Repository Layer | |  <-- NEW: abstracts DB access
                           |  +--------+---------+ |
                           |           |           |
                           |  +--------v---------+ |
                           |  | Drizzle ORM      | |  <-- NEW: replaces Mongoose
                           |  | (pg or sqlite)   | |
                           |  +------------------+ |
                           +-----------------------+
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| **web** (Next.js) | UI rendering, client state, API calls | server via HTTP REST |
| **server** (NestJS) | Business logic, auth, data access | web (responds to), db (queries) |
| **db** (PostgreSQL/SQLite) | Data persistence | server only |
| **uploads** (local volume) | File storage for screenshots | server (writes), web (reads via static serving) |
| **Repository Layer** (new) | Abstracts database operations behind interfaces | Services call repositories; repositories call Drizzle |
| **Drizzle ORM** (new) | SQL query building, schema definition, migrations | Database driver (pg or better-sqlite3) |
| **Auth Module** (modified) | Username/password auth, JWT tokens | UserRepository, JwtService |
| **File Storage Module** (new) | Local file upload/serving, replaces CDN | Disk filesystem, NestJS static serving |

## Recommended Project Structure

```
packages/
  server/
    src/
      db/                           # NEW: Database abstraction
        schema/                     # Drizzle schema definitions
          users.ts                  # pgTable/sqliteTable definitions
          teams.ts
          memberships.ts
          projects.ts
          tokens.ts
          activity-logs.ts
          index.ts                  # Re-exports all schemas
        migrations/                 # Drizzle Kit generated migrations
        drizzle.module.ts           # NestJS module for DI
        drizzle.provider.ts         # Creates drizzle instance based on env
        drizzle.config.ts           # Drizzle Kit config
      repository/                   # NEW: Repository layer
        user.repository.ts
        team.repository.ts
        membership.repository.ts
        project.repository.ts
        token.repository.ts
        activity-log.repository.ts
        base.repository.ts          # Generic CRUD base class
      service/                      # EXISTING: Business logic (modified)
        auth.service.ts             # Remove Feishu, keep local auth
        user.service.ts             # Delegates to UserRepository
        team.service.ts             # Delegates to TeamRepository
        project.service.ts          # Delegates to ProjectRepository + TokenRepository
        membership.service.ts       # Delegates to MembershipRepository
        activity-log.service.ts
        ai.service.ts               # Optional AI integration
        mcp.service.ts
        file-storage.service.ts     # NEW: Local file upload/serving
      controller/                   # EXISTING: HTTP endpoints (minor changes)
        auth.controller.ts          # Remove Feishu endpoints
        upload.controller.ts        # NEW: File upload endpoint
        ...existing controllers...
      jwt/                          # EXISTING: JWT auth (unchanged)
      middleware/                   # EXISTING: Request middleware (unchanged)
      interceptors/                 # EXISTING: Logging etc (unchanged)
      utils/                        # EXISTING: Utilities (unchanged)
      app.module.ts                 # Updated imports
      main.ts                       # Updated bootstrap
    uploads/                        # NEW: Local file storage directory
    drizzle.config.ts               # Drizzle Kit config (root level)
  web/
    api/
      upload.ts                     # Modified: points to local server, not CDN
    ...existing structure unchanged...

# Root level additions
docker-compose.yml                  # Full stack: web + server + db
docker-compose.dev.yml              # Dev: just db, run web+server locally
Dockerfile.web                      # Existing, minor updates
Dockerfile.server                   # Updated for Drizzle + migrations
.env.example                        # Template for all config
```

### Structure Rationale

- **db/schema/:** Drizzle schemas are co-located because they are tightly coupled to each other via relations. One file per entity matches current Mongoose schema structure, easing the mental mapping during migration.
- **db/migrations/:** Auto-generated by Drizzle Kit. Committed to git so deployments are reproducible.
- **repository/:** Isolates all SQL queries from business logic. Services never import Drizzle directly -- they only call repository methods. This is the key boundary that makes the database swappable and services testable.
- **service/:** Remains the business logic layer but no longer contains any database-specific code (no `@InjectModel`, no Mongoose `Model<T>` types). Services only depend on repository interfaces.
- **uploads/:** Docker volume-mounted directory for persistent file storage. Replaces external CDN dependency entirely.

## Architectural Patterns

### Pattern 1: Repository Abstraction Layer

**What:** Services call repository classes instead of ORM models directly. Each repository encapsulates all queries for a single entity.
**When to use:** Always -- this is the core architectural change enabling SQLite/PostgreSQL dual support.
**Trade-offs:** Adds one layer of indirection; gains testability and database portability.

**Example:**
```typescript
// repository/user.repository.ts
@Injectable()
export class UserRepository {
  constructor(@Inject('DRIZZLE') private db: DrizzleInstance) {}

  async findById(id: string): Promise<User | null> {
    const results = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return results[0] ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const results = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return results[0] ?? null;
  }

  async create(data: NewUser): Promise<User> {
    const results = await this.db
      .insert(users)
      .values(data)
      .returning();
    return results[0];
  }
}

// service/user.service.ts -- no Mongoose, no Drizzle imports
@Injectable()
export class UserService {
  constructor(private readonly userRepo: UserRepository) {}

  async findUserByEmail(email: string): Promise<User | null> {
    return this.userRepo.findByEmail(email);
  }
}
```

### Pattern 2: Conditional Database Driver via Environment Variable

**What:** A single NestJS module that creates either a PostgreSQL or SQLite Drizzle instance based on `DATABASE_DRIVER` env var.
**When to use:** At application bootstrap. The choice is made once at startup and stays for the lifetime of the process.
**Trade-offs:** Requires maintaining two schema files (pg dialect and sqlite dialect) or using a shared schema approach. Drizzle uses different table constructors per dialect (`pgTable` vs `sqliteTable`), so true schema sharing requires an adapter or codegen.

**Example:**
```typescript
// db/drizzle.provider.ts
import { Provider } from '@nestjs/common';

export const DRIZZLE = 'DRIZZLE';

export const DrizzleProvider: Provider = {
  provide: DRIZZLE,
  useFactory: async () => {
    const driver = process.env.DATABASE_DRIVER || 'sqlite';

    if (driver === 'postgresql') {
      const { drizzle } = await import('drizzle-orm/node-postgres');
      const { Pool } = await import('pg');
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      const * as pgSchema = await import('./schema/pg');
      return drizzle(pool, { schema: pgSchema });
    }

    // Default: SQLite
    const { drizzle } = await import('drizzle-orm/better-sqlite3');
    const Database = (await import('better-sqlite3')).default;
    const sqlite = new Database(process.env.DATABASE_PATH || './data/i18n.db');
    sqlite.pragma('journal_mode = WAL');
    const * as sqliteSchema = await import('./schema/sqlite');
    return drizzle(sqlite, { schema: sqliteSchema });
  },
};
```

**Critical note on dual-schema approach:** Drizzle ORM uses dialect-specific table constructors (`pgTable` for PostgreSQL, `sqliteTable` for SQLite). You cannot use a single schema file for both. The recommended approach is:
1. Define a canonical schema in a shared types file (TypeScript interfaces).
2. Create `schema/pg/` and `schema/sqlite/` directories with dialect-specific table definitions.
3. Use a small codegen script or manual sync to keep them aligned.
4. Both schemas export the same TypeScript types so repositories work identically against either.

**Confidence:** MEDIUM -- Drizzle's architecture inherently requires separate schema definitions per dialect. This is a known limitation documented in the Drizzle ORM repository. The alternative (TypeORM) handles this more transparently with decorators, but TypeORM has worse performance and more complex migration stories.

### Pattern 3: Local File Storage with Static Serving

**What:** Replace CDN upload with NestJS Multer-based local file storage. Files saved to a Docker volume-mounted directory, served via NestJS static file serving or a reverse proxy.
**When to use:** For all user-uploaded content (screenshots, avatars).
**Trade-offs:** No CDN = no edge caching. Acceptable for self-hosted use where users and server are typically on the same network.

**Example:**
```typescript
// service/file-storage.service.ts
@Injectable()
export class FileStorageService {
  private readonly uploadDir: string;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    fs.mkdirSync(this.uploadDir, { recursive: true });
  }

  async saveFile(file: Express.Multer.File): Promise<string> {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    const filepath = path.join(this.uploadDir, filename);
    await fs.promises.writeFile(filepath, file.buffer);
    return `/api/uploads/${filename}`;
  }

  getFilePath(filename: string): string {
    return path.join(this.uploadDir, filename);
  }
}

// controller/upload.controller.ts
@Controller('api/uploads')
export class UploadController {
  constructor(private readonly fileStorage: FileStorageService) {}

  @Post()
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const url = await this.fileStorage.saveFile(file);
    return { url };
  }

  @Get(':filename')
  async serveFile(@Param('filename') filename: string, @Res() res: Response) {
    const filepath = this.fileStorage.getFilePath(filename);
    return res.sendFile(filepath);
  }
}
```

### Pattern 4: Pluggable Auth with Strategy Pattern

**What:** Replace hardcoded Feishu OAuth with a clean local-only auth system. Design auth as a strategy so future OAuth providers can be added without changing core logic.
**When to use:** During auth module rewrite.
**Trade-offs:** More code upfront than a simple login function, but prevents the exact problem the codebase currently has (Feishu-specific code entangled in core auth).

**Example:**
```typescript
// Auth stays simple for OSS: username/password only
// But structured so adding OAuth later is non-breaking

// service/auth.service.ts (simplified)
@Injectable()
export class AuthService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async register(data: { name: string; email: string; password: string }) {
    const existing = await this.userRepo.findByEmail(data.email);
    if (existing) throw new BadRequestException('Email already registered');
    const hashed = hashPassword(data.password);
    const user = await this.userRepo.create({
      name: data.name,
      email: data.email,
      password: hashed,
      loginProvider: 'local',
    });
    return this.createJwtToken(user);
  }

  async login(data: { email: string; password: string }) {
    const user = await this.userRepo.findByEmail(data.email);
    if (!user || !verifyPassword(data.password, user.password)) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.createJwtToken(user);
  }

  // No Feishu, no joinDefaultTeam, no hardcoded team IDs
}
```

## Data Flow

### Request Flow

```
[Browser]
    |
    v
[Next.js SSR / Client] --HTTP--> [NestJS Controller]
    |                                    |
    | (Jotai atoms, AuthContext)         | @UseGuards(AuthGuard)
    |                                    | @CurrentUser() decorator
    v                                    v
[API Client]                      [Service Layer]
    |                                    |
    | Bearer JWT in header               | Business logic, validation
    |                                    v
    |                             [Repository Layer]
    |                                    |
    |                                    | Drizzle query builder
    |                                    v
    |                             [Database (PG or SQLite)]
    v
[Response rendered in UI]
```

### Database Migration Flow (Mongoose to Drizzle)

```
Current:
  Service --> @InjectModel(User.name) --> Mongoose Model<UserDocument> --> MongoDB

Target:
  Service --> UserRepository (injected) --> Drizzle query builder --> PostgreSQL/SQLite

Migration path per entity:
  1. Define Drizzle schema (relational tables)
  2. Create Repository class with same public API as current service methods
  3. Update Service to use Repository instead of Mongoose Model
  4. Remove Mongoose schema file
  5. Run Drizzle migration to create tables
```

### Key Data Flows

1. **Auth flow:** Browser --> POST /api/auth/login --> AuthController --> AuthService --> UserRepository --> DB lookup --> JWT creation --> Response with token. No Feishu. No default team join.

2. **Token CRUD flow:** Browser --> POST /api/project/:id/token --> ProjectController --> checks MembershipRepository for permissions --> TokenRepository.create() --> DB insert + ActivityLogRepository.create() --> Response with created token.

3. **File upload flow:** Browser --> POST /api/uploads (multipart) --> UploadController --> FileStorageService.saveFile() --> disk write to ./uploads/ --> Response with local URL path. Frontend stores URL in token.screenshots array.

4. **Import/Export flow:** Same as current, but repository methods replace Mongoose queries. Import uses transactions (Drizzle supports them for both PG and SQLite with WAL mode).

## Schema Migration: Mongoose to Relational

### Entity Mapping

| Mongoose Schema | Relational Table(s) | Key Changes |
|----------------|---------------------|-------------|
| User | `users` | Remove `feishuId`, `feishuUnionId`, `loginProvider` enum drops 'feishu'. UUID primary key replaces ObjectId. |
| Team | `teams` | Remove `memberships` array (now a join via memberships table). UUID PK. |
| Membership | `memberships` | Already a join table conceptually. Add unique constraint on (userId, teamId). Foreign keys to users and teams. |
| Project | `projects` | `languages` becomes a JSON column (both PG and SQLite support JSON). `languageLabels` becomes JSON. `modules` becomes JSON array. Remove `tokens` array ref (query via tokenRepository). Foreign key to teams. |
| Token | `tokens` | `translations` becomes JSON column. `screenshots` becomes JSON array. `history` becomes separate `token_history` table (normalize the embedded array). Foreign key to projects. |
| TokenHistory | `token_history` (new table) | Currently embedded in Token. Normalize to its own table with foreign keys to tokens and users. Enables efficient history queries. |
| ActivityLog | `activity_logs` | `details` becomes JSON column. Foreign keys to projects and users. Indexes on (projectId, createdAt) and (userId, createdAt). |

### Mongoose-Specific Patterns That Change

| MongoDB Pattern | Relational Equivalent |
|----------------|----------------------|
| `ObjectId` references + `.populate()` | Foreign keys + JOIN queries |
| Embedded documents (TokenHistory in Token) | Separate table with foreign key |
| `$push` to arrays (tokens in project) | Insert row in related table |
| `$addToSet` on arrays | Insert with unique constraint or INSERT ... ON CONFLICT |
| `$regex` search | `LIKE` / `ILIKE` (PG) or `LIKE` (SQLite) |
| `session.withTransaction()` | `db.transaction()` in Drizzle |
| `Map<string, string>` type | JSON column |
| Virtual `id` field from `_id` | UUID `id` column is the real primary key |

### Data Type Mapping

| Mongoose Type | PostgreSQL | SQLite |
|--------------|------------|--------|
| `ObjectId` | `uuid` (with `gen_random_uuid()`) | `text` (UUID stored as string) |
| `String` | `text` / `varchar` | `text` |
| `Number` | `integer` / `real` | `integer` / `real` |
| `Date` | `timestamp` | `text` (ISO 8601) or `integer` (unix) |
| `Boolean` | `boolean` | `integer` (0/1) |
| `Mixed` (JSON blob) | `jsonb` | `text` (JSON string, parsed in app) |
| `[String]` (array) | `text[]` or `jsonb` | `text` (JSON array string) |
| `Map<K,V>` | `jsonb` | `text` (JSON string) |

## Build Order (Dependencies Between Components)

This is the critical section for roadmap phasing. Components must be built in dependency order.

### Phase 1: Database Foundation (must be first)

**Build:**
1. Drizzle schema definitions (both PG and SQLite dialects)
2. DrizzleModule + DrizzleProvider (conditional driver)
3. Migration files via Drizzle Kit
4. Base repository class

**Why first:** Everything else depends on the data layer. Cannot modify services or controllers until repositories exist.

**Depends on:** Nothing.

### Phase 2: Repository Layer + Service Migration

**Build:**
1. UserRepository, TeamRepository, MembershipRepository
2. ProjectRepository, TokenRepository, ActivityLogRepository
3. Refactor each Service to use its Repository (remove `@InjectModel`, remove Mongoose imports)
4. Remove MongooseService, database.module.ts, all schema files in models/

**Why second:** Services are the consumers of repositories. Each service can be migrated independently (one at a time), and tested with the new database.

**Depends on:** Phase 1 (schema + repositories must exist).

### Phase 3: Auth System Replacement

**Build:**
1. Remove all Feishu-related code from AuthService
2. Remove `feishuId`, `feishuUnionId` from User schema
3. Remove `loginWithFeishu` endpoint from AuthController
4. Remove `joinDefaultTeam` (hardcoded team ID)
5. Clean up frontend login page (remove Feishu OAuth button/flow)
6. Ensure register + login work with new UserRepository

**Why third:** Auth depends on UserRepository (Phase 2). Auth is isolated enough to change without affecting other services.

**Depends on:** Phase 2 (UserRepository).

### Phase 4: File Storage Replacement

**Build:**
1. FileStorageService with Multer + local disk
2. UploadController with POST and GET endpoints
3. Update frontend `packages/web/api/upload.ts` to hit local server
4. Update Token schema to store local paths instead of CDN URLs
5. Configure NestJS to serve static files from uploads directory

**Why fourth:** File storage is a leaf dependency -- nothing else needs to change for it to work. Can be done in parallel with Phase 3 in practice.

**Depends on:** Phase 1 (schema, since Token has screenshots field), Phase 2 (TokenRepository).

### Phase 5: Docker Deployment

**Build:**
1. Update `docker-compose.yml` with three services (web, server, db)
2. Add `docker-compose.sqlite.yml` override for SQLite-only mode (no db service)
3. Update `Dockerfile.server` to include Drizzle migration step
4. Add `.env.example` with all configuration variables
5. Add health checks and proper `depends_on` conditions
6. Volume mount for uploads directory and SQLite file

**Why last:** Docker wraps everything else. All application code must be working before containerizing.

**Depends on:** Phases 1-4 (all application changes complete).

### Dependency Graph

```
Phase 1: DB Foundation
    |
    v
Phase 2: Repositories + Service Migration
    |         |
    v         v
Phase 3:   Phase 4:
Auth       File Storage
    |         |
    +----+----+
         |
         v
Phase 5: Docker Deployment
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1-50 users (typical self-hosted) | SQLite is fine. Single Docker host. No optimization needed. |
| 50-500 users | Switch to PostgreSQL. Add connection pooling. Still single host. |
| 500+ users | PostgreSQL with read replicas. Separate file storage (S3-compatible like MinIO). Add Redis for session caching. This is beyond typical self-hosted scope. |

### Scaling Priorities

1. **First bottleneck:** Token table size. Projects with thousands of tokens and JSON translation blobs will stress SQLite. PostgreSQL with `jsonb` indexing handles this well. Mitigation: recommend PostgreSQL for production in docs.
2. **Second bottleneck:** File storage. Screenshots accumulate. Mitigation: configurable storage backend (local by default, S3-compatible optional).

## Anti-Patterns

### Anti-Pattern 1: Shared Schema File for PG and SQLite

**What people do:** Try to write one schema.ts that works for both PostgreSQL and SQLite using Drizzle.
**Why it's wrong:** Drizzle requires dialect-specific table constructors (`pgTable` vs `sqliteTable`). Attempting to abstract over this leads to type errors, lost type safety, and unmaintainable codegen hacks.
**Do this instead:** Maintain two small schema directories (`schema/pg/` and `schema/sqlite/`). They share the same column names and TypeScript types. Use the conditional provider to load the right one.

### Anti-Pattern 2: Leaking ORM into Services

**What people do:** Import Drizzle's `eq()`, `and()`, `sql` operators directly in service files.
**Why it's wrong:** Couples business logic to the ORM. When you need to change a query, you're editing business logic files. Makes unit testing services require a real database.
**Do this instead:** All Drizzle imports stay in repository files. Services call repository methods with plain TypeScript arguments.

### Anti-Pattern 3: Using Mongoose Populate-Style Eager Loading

**What people do:** Replicate Mongoose's `.populate()` pattern by writing Drizzle queries that JOIN everything eagerly.
**Why it's wrong:** SQL JOINs can be expensive. The current codebase populates membership -> user -> email on nearly every team query. In relational DBs, this produces large result sets.
**Do this instead:** Load only what each endpoint needs. Use Drizzle's relational query API for specific includes. Consider separate queries for nested data (N+1 is sometimes faster than a massive JOIN for small datasets).

### Anti-Pattern 4: Running Migrations at Application Startup

**What people do:** Call `drizzle-kit migrate` inside `main.ts` or `onModuleInit`.
**Why it's wrong:** Race conditions in multi-instance deployments. Migration failures crash the app. No rollback control.
**Do this instead:** Run migrations as a separate Docker entrypoint step or init container. Migration runs once, then the application starts.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| AI/Dify (optional) | HTTP client via AiService | Already abstracted behind AiService. Make fully optional: if no `AI_API_URL` env var, disable AI endpoints gracefully. |
| MCP Server | In-process via McpService | No external dependency. Uses MCP SDK. Unaffected by DB change. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| web <-> server | HTTP REST (JSON) | No change. API contract stays the same. Frontend is database-agnostic. |
| server <-> db | Drizzle ORM (SQL) | Replaces Mongoose ODM (BSON/MongoDB wire protocol). |
| Controller <-> Service | NestJS DI, method calls | No change. |
| Service <-> Repository | NestJS DI, method calls | NEW boundary. Services never bypass repositories. |
| Repository <-> Drizzle | Direct import of drizzle instance | Repository is the only layer that knows about Drizzle. |
| FileStorage <-> Disk | Node.js fs module | Files stored in Docker volume at `./uploads/`. |
| web <-> FileStorage | HTTP GET for serving files | Frontend fetches `/api/uploads/:filename` which server serves from disk. |

### Docker Network Architecture

```
docker-compose.yml:
  services:
    web:
      build: ./Dockerfile.web
      ports: ["3000:3000"]
      environment:
        NEXT_PUBLIC_API_URL: http://server:3001  # internal docker network
      depends_on: [server]

    server:
      build: ./Dockerfile.server
      ports: ["3001:3001"]
      environment:
        DATABASE_DRIVER: postgresql          # or 'sqlite'
        DATABASE_URL: postgres://...         # for PG
        DATABASE_PATH: /data/i18n.db         # for SQLite
        UPLOAD_DIR: /data/uploads
        JWT_SECRET: ${JWT_SECRET}
      volumes:
        - uploads_data:/data/uploads
        - sqlite_data:/data                  # only used in SQLite mode
      depends_on:
        db:
          condition: service_healthy          # only when using PG

    db:                                       # only in PG mode
      image: postgres:16-alpine
      environment:
        POSTGRES_DB: i18n
        POSTGRES_USER: ${DB_USER}
        POSTGRES_PASSWORD: ${DB_PASSWORD}
      volumes:
        - pg_data:/var/lib/postgresql/data
      healthcheck:
        test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
        interval: 5s
        timeout: 5s
        retries: 5
```

For SQLite mode, provide a `docker-compose.sqlite.yml` override that removes the `db` service and changes `DATABASE_DRIVER` to `sqlite`. Users run:
- **Quick start (SQLite):** `docker compose -f docker-compose.yml -f docker-compose.sqlite.yml up`
- **Production (PostgreSQL):** `docker compose up`

## Sources

- [NestJS Database Documentation](https://docs.nestjs.com/techniques/database) -- Official NestJS database integration docs (HIGH confidence)
- [NestJS & DrizzleORM: A Great Match - Trilon Consulting](https://trilon.io/blog/nestjs-drizzleorm-a-great-match) -- Official NestJS consulting partner's Drizzle integration guide (HIGH confidence)
- [Repository Pattern in NestJS with Drizzle ORM](https://medium.com/@vimulatus/repository-pattern-in-nest-js-with-drizzle-orm-e848aa75ecae) -- Repository pattern implementation (MEDIUM confidence)
- [nestjs-drizzle GitHub](https://github.com/knaadh/nestjs-drizzle) -- Community NestJS module for Drizzle with PG, SQLite, MySQL drivers (MEDIUM confidence)
- [Drizzle ORM SQLite Getting Started](https://orm.drizzle.team/docs/get-started-sqlite) -- Official Drizzle SQLite docs (HIGH confidence)
- [Drizzle ORM PostgreSQL Getting Started](https://orm.drizzle.team/docs/get-started/postgresql-new) -- Official Drizzle PostgreSQL docs (HIGH confidence)
- [Drizzle ORM Config Reference](https://orm.drizzle.team/kit-docs/config-reference) -- Drizzle Kit configuration (HIGH confidence)
- [TypeORM Migrations with SQLite in NestJS](https://dawid.dev/dev/backend/typeorm-migrations-nestjs-sqlite-a-complete-guide) -- SQLite migration patterns (MEDIUM confidence)
- [NestJS File Uploads with Multer](https://www.freecodecamp.org/news/how-to-handle-file-uploads-in-nestjs-with-multer/) -- Multer integration patterns (HIGH confidence)
- [Docker NestJS + Next.js Monorepo Best Practices](https://forums.docker.com/t/best-practices-for-using-docker-in-development-vs-production-nestjs-nextjs-monorepo/149461) -- Docker deployment patterns (MEDIUM confidence)
- [Best ORM for NestJS in 2025: Drizzle vs TypeORM vs Prisma](https://dev.to/sasithwarnakafonseka/best-orm-for-nestjs-in-2025-drizzle-orm-vs-typeorm-vs-prisma-229c) -- ORM comparison (MEDIUM confidence)

---
*Architecture research for: Open-source i18n platform (MongoDB to SQLite/PostgreSQL conversion)*
*Researched: 2026-03-01*
