# Codebase Structure

**Analysis Date:** 2026-03-01

## Directory Layout

```
qlj-fe-i18n/
├── packages/
│   ├── web/                    # Frontend Next.js application
│   │   ├── app/                # Next.js app router pages
│   │   ├── components/         # React components (UI, views, data-table)
│   │   ├── hooks/              # Custom React hooks
│   │   ├── api/                # API client modules
│   │   ├── lib/                # Utility functions (auth, API, validation)
│   │   ├── jotai/              # Global state atoms
│   │   ├── i18n/               # Internationalization (messages)
│   │   ├── public/             # Static assets
│   │   ├── constants/          # Constants (languages, etc)
│   │   ├── config/             # Configuration files
│   │   ├── types/              # TypeScript type definitions
│   │   ├── scripts/            # Build/utility scripts
│   │   ├── middleware.ts       # Next.js middleware
│   │   ├── tailwind.config.ts  # Tailwind CSS config
│   │   ├── next.config.mjs     # Next.js config
│   │   ├── tsconfig.json       # TypeScript config
│   │   └── package.json        # Web package dependencies
│   │
│   └── server/                 # Backend NestJS application
│       ├── src/                # Source code
│       │   ├── controller/     # HTTP endpoint handlers
│       │   ├── service/        # Business logic
│       │   ├── models/         # Mongoose schemas
│       │   │   ├── schemas/    # Schema definitions
│       │   │   └── index.ts    # Model exports
│       │   ├── modules/        # Feature modules (database, etc)
│       │   ├── jwt/            # JWT authentication
│       │   ├── middleware/     # Express middleware
│       │   ├── interceptors/   # NestJS interceptors
│       │   ├── utils/          # Utility functions
│       │   ├── types/          # TypeScript type definitions
│       │   ├── docs/           # Documentation
│       │   ├── scripts/        # Database seeds, utilities
│       │   ├── app.module.ts   # Root module
│       │   └── main.ts         # Application entry point
│       ├── test/               # E2E tests
│       ├── dist/               # Compiled output
│       ├── package.json        # Server package dependencies
│       └── tsconfig.json       # TypeScript config
│
├── init/                       # Initialization scripts
├── .planning/                  # GSD planning directory
│   └── codebase/               # Codebase analysis documents
├── .cursor/                    # Cursor IDE configuration
└── package.json                # Root monorepo package
```

## Directory Purposes

**packages/web/app/:**
- Purpose: Next.js App Router pages and layout hierarchy
- Contains: `.tsx` files for routes (login, teams, projects, profile, etc.)
- Key files: `layout.tsx` (root layout), `page.tsx` (home redirect logic), `[projectId]/page.tsx` (dynamic routes)
- Pattern: Follows Next.js conventions with `(group)` folders for layout sections (not currently used)

**packages/web/components/ui/:**
- Purpose: Reusable UI primitives from Radix UI and shadcn/ui
- Contains: Buttons, inputs, dialogs, tabs, cards, etc.
- Key files: All Radix UI wrapppers (alert-dialog.tsx, checkbox.tsx, dialog.tsx, etc.)
- Pattern: One component per file, named with PascalCase

**packages/web/components/views/:**
- Purpose: Feature-specific view containers that compose UI components
- Contains: TeamsView, ProjectView, UserView, and specialized dialogs for team/project management
- Key files: `teamsView/index.tsx` (team listing), `projectView/index.tsx` (project editor), nested dialogs for modals
- Pattern: Organized by feature; complex views split into sub-components for team cards, headers, actions

**packages/web/components/data-table/:**
- Purpose: Reusable data table component for displaying token lists
- Contains: Table composition logic, column definitions
- Key files: DataTable component that wraps TanStack React Table
- Pattern: Headless table component accepting columns and data as props

**packages/web/hooks/:**
- Purpose: Custom React hooks for common patterns
- Contains: useAuth (via context), useDataTable, useToast, useCallback utilities
- Key files: `use-data-table.ts`, `use-toast.ts`, `use-debounced-callback.ts`
- Pattern: Named with `use-` prefix following React conventions

**packages/web/api/:**
- Purpose: API client modules for each domain (auth, user, team, project, AI)
- Contains: Typed fetch functions and response interfaces for each feature
- Key files: `auth.ts` (login/register), `team.ts` (team CRUD), `project.ts` (project CRUD), `ai.ts` (AI features)
- Pattern: One module per feature domain; each exports typed async functions

**packages/web/lib/:**
- Purpose: Utility libraries and infrastructure code
- Contains: API client wrapper, auth context, validation schemas, data transformation helpers
- Key files: `api.ts` (HTTP client), `auth/auth-context.tsx` (auth provider), `validation.ts`, `composition.ts`, `parsers.ts`
- Pattern: Organized by concern (auth/, general utilities)

**packages/web/jotai/:**
- Purpose: Global state management atoms
- Contains: Jotai atom definitions for shared state
- Key files: `index.ts` (team, project atoms), `types.ts` (state types)
- Pattern: Simple atom exports; components use useAtom() hook to read/write

**packages/web/i18n/:**
- Purpose: Internationalization message files
- Contains: Translated strings for UI text
- Key files: `messages/` subdirectory with locale-specific JSON files
- Pattern: Structured by page/feature; consumed by next-intl client provider

**packages/server/src/controller/:**
- Purpose: HTTP endpoint definitions and request handling
- Contains: NestJS controllers for each domain (auth, user, team, project, AI, MCP)
- Key files: `auth.controller.ts` (login/register endpoints), `team.controller.ts` (team management), `project.controller.ts` (project management)
- Pattern: One controller per feature domain; methods decorated with @Get/@Post/@Put/@Delete

**packages/server/src/service/:**
- Purpose: Business logic and data transformation
- Contains: Services that implement domain operations
- Key files: `auth.service.ts` (password hashing, JWT, Feishu OAuth), `team.service.ts` (team CRUD), `membership.service.ts` (role checking)
- Pattern: One service per domain; @Injectable() decorated classes with public async methods

**packages/server/src/models/schemas/:**
- Purpose: Mongoose schema definitions
- Contains: Schema classes decorated with @Schema()
- Key files: `user.schema.ts`, `team.schema.ts`, `project.schema.ts`, `token.schema.ts`, `membership.schema.ts`, `activity-log.schema.ts`
- Pattern: One schema per file; exports both class and schema via SchemaFactory

**packages/server/src/jwt/:**
- Purpose: JWT authentication and authorization
- Contains: JWT strategy, guards, decorators
- Key files: `strategy.ts` (JwtStrategy class), `guard.ts` (AuthGuard), `current-user.decorator.ts` (CurrentUser decorator)
- Pattern: Integrates with Passport.js; guard validates on each protected route

**packages/server/src/middleware/:**
- Purpose: Express middleware for request processing
- Contains: Request ID middleware for logging
- Key files: `request-id.middleware.ts` (adds unique ID to each request)
- Pattern: Applied globally to all routes via app.module.ts configure()

**packages/server/src/interceptors/:**
- Purpose: NestJS interceptors for cross-cutting concerns
- Contains: Logging interceptor
- Key files: `logging.interceptor.ts` (logs requests/responses)
- Pattern: Applied globally via app.useGlobalInterceptors()

**packages/server/src/utils/:**
- Purpose: Utility functions and helpers
- Contains: Crypto (password hashing), JSON processing, object utilities, transaction helpers
- Key files: `crypto.ts` (hash/verify functions), `transaction.ts` (database transactions), `importFrom.ts`/`exportTo.ts` (file operations)
- Pattern: Stateless functions; one concept per file

**packages/server/src/modules/:**
- Purpose: Feature modules encapsulating sub-components
- Contains: Database module
- Key files: `database.module.ts` (Mongoose connection, schema registration)
- Pattern: @Module() decorated classes that import/export other modules

**packages/server/src/scripts/:**
- Purpose: One-off scripts for seeding, migrations, utilities
- Contains: Database seed scripts
- Key files: Scripts for initializing test data

## Key File Locations

**Entry Points:**

- `packages/web/app/layout.tsx`: Root layout wrapping app with providers (Auth, I18n)
- `packages/web/app/page.tsx`: Home page with redirect logic (unauthenticated → login, authenticated → teams)
- `packages/server/src/main.ts`: NestJS bootstrap; creates app, applies global interceptors, starts server
- `packages/server/src/app.module.ts`: Root module defining controllers, services, imports, middleware

**Configuration:**

- `packages/web/package.json`: Frontend dependencies (React, Next.js, Radix UI, Jotai, React Hook Form, Zod)
- `packages/web/tsconfig.json`: TypeScript configuration with `@/*` path alias
- `packages/web/next.config.mjs`: Next.js configuration (currently minimal)
- `packages/web/tailwind.config.ts`: Tailwind CSS configuration for styling
- `packages/server/package.json`: Backend dependencies (NestJS, JWT, Mongoose, Zod)
- `packages/server/tsconfig.json`: TypeScript configuration for server

**Core Logic:**

- `packages/web/lib/auth/auth-context.tsx`: React Context managing authentication state
- `packages/web/lib/api.ts`: Fetch wrapper with automatic token inclusion and error handling
- `packages/web/api/auth.ts`: API functions for login/register/checkAuthStatus
- `packages/server/src/service/auth.service.ts`: Password verification, JWT token creation, Feishu OAuth
- `packages/server/src/service/membership.service.ts`: Role checking logic (isMember, isManager, isOwner)

**Testing:**

- `packages/server/test/`: E2E tests directory (jest.json configuration)
- `packages/server/src/controller/index.controller.spec.ts`: Example spec file
- `packages/server/package.json`: Jest configuration inline (rootDir: "src", testRegex: ".*\.spec\.ts$")

## Naming Conventions

**Files:**

- PascalCase for React components: `TeamsView.tsx`, `ProjectCard.tsx`, `EditTeamDialog.tsx`
- camelCase for utilities and services: `auth.service.ts`, `user.controller.ts`, `api.ts`
- snake_case for database/schema files: `user.schema.ts`, `activity-log.schema.ts`
- kebab-case for hooks: `use-debounced-callback.ts`, `use-data-table.ts`

**Directories:**

- Lowercase for feature directories: `teams/`, `projects/`, `user/`
- Lowercase for utility directories: `lib/`, `api/`, `utils/`, `hooks/`
- Nested directories match feature structure: `views/teamsView/`, `views/projectView/`
- Dynamic route segments in brackets: `[projectId]/`, `[userId]/`, `[teamId]/`

## Where to Add New Code

**New Feature (e.g., "invite users"):**
- Primary code: `packages/server/src/service/` (add method to MembershipService or new service)
- Backend endpoint: `packages/server/src/controller/` (add @Post method to appropriate controller)
- Frontend component: `packages/web/components/views/` (add dialog or form component)
- Frontend API: `packages/web/api/` (add typed fetch function)
- Frontend page: `packages/web/app/` (add new route if needed) or use existing view

**New Component/Module:**
- Implementation: `packages/web/components/` (organize under ui/ or views/)
- If reusable: Place in `components/ui/` and export from index
- If feature-specific: Place under `components/views/[feature]/` with nested sub-components
- Types: Add to `packages/web/types/` if shared across components
- Hooks if needed: Place in `packages/web/hooks/`

**Utilities:**
- Shared helpers: `packages/web/lib/` (frontend) or `packages/server/src/utils/` (backend)
- Domain-specific: Place in relevant service or create new utility file
- API operations: Create in `packages/web/api/[domain].ts`
- Backend utilities: Create in `packages/server/src/utils/[concern].ts`

**Database/Models:**
- Schema: Create new file in `packages/server/src/models/schemas/[entity].schema.ts`
- Register in `packages/server/src/modules/database.module.ts` MongooseModule.forFeature()
- Export from `packages/server/src/models/index.ts`
- Service for CRUD: Create in `packages/server/src/service/[entity].service.ts`

**API Endpoints:**
- Controller: Add method to existing controller in `packages/server/src/controller/` or create new
- Service logic: Implement in corresponding service file
- Guards: Use @UseGuards(AuthGuard) for protected routes; add CurrentUser() parameter if need user
- Middleware/Interceptors: Add to respective files if cross-cutting; apply globally in app.module.ts if needed

## Special Directories

**packages/web/public/:**
- Purpose: Static assets served directly by Next.js
- Generated: No
- Committed: Yes
- Contains: Images, fonts, favicon, robots.txt

**packages/server/dist/:**
- Purpose: Compiled TypeScript output from src/
- Generated: Yes (by `npm run build`)
- Committed: No (in .gitignore)
- Contains: JavaScript files matching src/ structure

**packages/web/.next/:**
- Purpose: Next.js build cache and compiled output
- Generated: Yes (by `npm run build` or `npm run dev`)
- Committed: No (in .gitignore)
- Contains: Cache, types, compiled pages, static assets

**packages/server/src/docs/:**
- Purpose: API documentation and examples
- Generated: No
- Committed: Yes
- Contains: API specs, integration guides, examples

**packages/web/i18n/messages/:**
- Purpose: Locale-specific translation files
- Generated: No (managed manually)
- Committed: Yes
- Contains: JSON files per language with translation keys

**packages/server/node_modules/, packages/web/node_modules/:**
- Purpose: Installed dependencies
- Generated: Yes (by pnpm install)
- Committed: No (in .gitignore)
- Contains: Third-party packages

---

*Structure analysis: 2026-03-01*
