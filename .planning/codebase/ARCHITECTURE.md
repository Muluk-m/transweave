# Architecture

**Analysis Date:** 2026-03-01

## Pattern Overview

**Overall:** Monorepo with separate backend and frontend packages following a multi-layered architecture pattern.

**Key Characteristics:**
- Microservices-ready structure with independent web and server packages
- Backend: NestJS-based REST API with modular service layer
- Frontend: Next.js with app router, client-side state management via Jotai
- Clear separation of concerns: controllers → services → data models
- Role-based access control (RBAC) at multiple layers
- Token-based JWT authentication with refresh mechanisms

## Layers

**Presentation Layer (Frontend):**
- Purpose: User-facing React components, pages, and UI interactions
- Location: `packages/web/app`, `packages/web/components`
- Contains: Page components, view components, UI primitives, layout management
- Depends on: API clients, state management (Jotai), authentication context
- Used by: End users via browser

**API Client Layer (Frontend):**
- Purpose: HTTP request handling and authentication token management
- Location: `packages/web/lib/api.ts`, `packages/web/api/`
- Contains: Axios-based API client, request/response interceptors, error handling
- Depends on: localStorage for token persistence
- Used by: Views and components for server communication

**State Management Layer (Frontend):**
- Purpose: Global state and context management
- Location: `packages/web/jotai/`, `packages/web/lib/auth/auth-context.tsx`
- Contains: Jotai atoms for teams, projects, users; React Context for auth state
- Depends on: API clients
- Used by: All components requiring shared state

**Authentication Layer (Backend & Frontend):**
- Purpose: User authentication, authorization, and JWT token handling
- Location Backend: `packages/server/src/jwt/`, `packages/server/src/service/auth.service.ts`
- Location Frontend: `packages/web/lib/auth/`, `packages/web/api/auth.ts`
- Contains: JWT strategy, guards, password hashing, Feishu OAuth integration
- Depends on: User service, database models
- Used by: All protected endpoints and features

**Controller Layer (Backend):**
- Purpose: HTTP endpoint definitions and request routing
- Location: `packages/server/src/controller/`
- Contains: Decorators for routes (GET, POST, PUT, DELETE), request validation, response formatting
- Depends on: Services, guards, middleware
- Used by: NestJS routing system

**Service Layer (Backend):**
- Purpose: Business logic, data transformation, and domain operations
- Location: `packages/server/src/service/`
- Contains: UserService, TeamService, ProjectService, AuthService, MembershipService, McpService, AiService
- Depends on: Database models, external APIs (Feishu, AI providers)
- Used by: Controllers and other services

**Data Access Layer (Backend):**
- Purpose: Direct database interaction and schema management
- Location: `packages/server/src/models/`, `packages/server/src/models/schemas/`
- Contains: Mongoose schemas and models (User, Team, Project, Membership, Token, ActivityLog)
- Depends on: MongoDB via Mongoose ODM
- Used by: Services for CRUD operations

**Infrastructure Layer (Backend):**
- Purpose: Cross-cutting concerns, middleware, and system configuration
- Location: `packages/server/src/middleware/`, `packages/server/src/interceptors/`, `packages/server/src/utils/`
- Contains: Request ID middleware, logging interceptor, crypto utilities, validators, transaction helpers
- Depends on: NestJS core
- Used by: All layers

## Data Flow

**Authentication Flow:**

1. User submits login credentials (email + password) or Feishu code to frontend
2. Frontend API client (`packages/web/api/auth.ts`) sends POST to `/api/auth/login` or `/api/auth/login_feishu`
3. Backend AuthController validates request and calls AuthService
4. AuthService verifies password (via crypto utils) or fetches Feishu user info via HTTP
5. On success, AuthService calls UserService to find/create user and generates JWT token
6. JWT token and user data returned to frontend
7. Frontend stores token in localStorage and updates AuthContext
8. AuthContext notifies all subscribed components of authentication state
9. Subsequent requests include token in Authorization header via apiClient
10. Backend AuthGuard middleware validates JWT on protected routes

**Team & Project Access Flow:**

1. User navigates to teams page (`packages/web/app/teams/page.tsx`)
2. Component calls TeamController via API (`/api/team/all`)
3. Backend extracts user from JWT token via CurrentUser decorator
4. TeamService queries Membership collection to find user's teams
5. MembershipService verifies user has 'member' or higher role
6. If authorized, returns team documents with populated user/project references
7. Frontend stores teams in Jotai atoms (`packages/web/jotai/index.ts`)
8. Components subscribe to atoms and render team cards
9. User selects a project, triggering ProjectController query with permission check
10. Frontend stores current team/project atoms for use by all descendant components

**State Management:**

**Frontend State:**
- Global atoms managed by Jotai: `nowTeamAtom`, `teamsAtom`, `nowProjectAtom`, `projectsAtom`
- Authentication context via React Context: user, loading state, error messages, login/logout functions
- Local component state via React hooks for form inputs, UI toggles, pagination

**Backend State:**
- Database-persisted: MongoDB documents for User, Team, Project, Token, ActivityLog
- Request-scoped: User object attached to Request object via JWT strategy
- Session-less: Each request is stateless and authenticated independently

## Key Abstractions

**AuthGuard (Backend):**
- Purpose: Validate JWT tokens and authorize route access
- Examples: `packages/server/src/jwt/guard.ts`
- Pattern: NestJS CanActivate guard that extracts token from Authorization header, validates signature, and attaches user to request object

**CurrentUser Decorator (Backend):**
- Purpose: Extract authenticated user from request object
- Examples: `packages/server/src/jwt/current-user.decorator.ts`
- Pattern: Custom NestJS parameter decorator that retrieves user payload from request context, enabling cleaner controller signatures

**ApiClient (Frontend):**
- Purpose: Unified HTTP client with automatic authentication and error handling
- Examples: `packages/web/lib/api.ts`
- Pattern: Promise-based fetch wrapper that automatically includes Bearer token, logs requests/responses, and transforms errors

**AuthContext (Frontend):**
- Purpose: Provide authentication state to entire component tree
- Examples: `packages/web/lib/auth/auth-context.tsx`
- Pattern: React Context Provider that manages login/logout/registration and exposes useAuth hook for consumption

**MembershipService (Backend):**
- Purpose: Manage user roles and permissions within teams and projects
- Examples: `packages/server/src/service/membership.service.ts`
- Pattern: Service encapsulates role-checking logic (isMember, isManager, isOwner) used across controllers for authorization

**View Components (Frontend):**
- Purpose: Compose UI components into feature-specific screens
- Examples: `packages/web/components/views/teamsView/`, `packages/web/components/views/projectView/`
- Pattern: Complex components that manage local state and orchestrate sub-components, providing data to Jotai atoms

## Entry Points

**Backend Entry Point:**
- Location: `packages/server/src/main.ts`
- Triggers: Server startup via `npm run start:dev` or `npm run start:prod`
- Responsibilities: Bootstrap NestJS application, apply global interceptors (logging), start HTTP server on port 3001 or process.env.PORT

**Frontend Entry Point:**
- Location: `packages/web/app/layout.tsx`, `packages/web/app/page.tsx`
- Triggers: Browser navigation or page load
- Responsibilities: Wrap entire app with providers (Auth, NuqsAdapter, I18nClientProvider), render root layout with header and main content, redirect unauthenticated users to login

**Root Module (Backend):**
- Location: `packages/server/src/app.module.ts`
- Triggers: NestFactory.create() in main.ts
- Responsibilities: Register all controllers, services, and modules; configure JWT globally; apply middleware (RequestId) to all routes

**Database Connection:**
- Location: `packages/server/src/modules/database.module.ts`
- Triggers: AppModule initialization
- Responsibilities: Connect to MongoDB via Mongoose, register all schemas (User, Team, Project, etc.), export schemas for feature modules

## Error Handling

**Strategy:** Hierarchical error handling with service-level validation and controller-level HTTP exception mapping.

**Patterns:**

- **Backend Validation:** Services throw BadRequestException or UnauthorizedException; controllers catch and map to appropriate HTTP status codes
  - Example: `packages/server/src/service/auth.service.ts` throws `BadRequestException` for duplicate emails, AuthController catches and returns HTTP 400

- **Backend Authorization:** MembershipService performs role checks; controllers throw ForbiddenException if user lacks permission
  - Example: `packages/server/src/controller/team.controller.ts` checks `isManagerOrOwner()` before allowing team updates, throws 403 if unauthorized

- **Frontend API Errors:** ApiClient logs all errors to console; calling code wraps API calls in try-catch and displays toast notifications
  - Example: `packages/web/lib/api.ts` logs request/response details; `packages/web/lib/auth/auth-context.tsx` catches login errors and sets error state

- **Frontend Auth Errors:** AuthContext catches login/register/Feishu errors, sets error state, and re-throws for page-level handling
  - Example: Login page catches auth errors and displays form validation messages

## Cross-Cutting Concerns

**Logging:**
- Backend: LoggingInterceptor in `packages/server/src/interceptors/logging.interceptor.ts` logs all requests/responses
- Frontend: ApiClient in `packages/web/lib/api.ts` logs request/response details to browser console using console.group()

**Validation:**
- Backend: Zod schemas used in services for input validation before database operations
- Frontend: React Hook Form with Zod resolvers for client-side validation before API submission

**Authentication:**
- Backend: JwtStrategy + AuthGuard validate token on protected routes; CurrentUser decorator extracts user
- Frontend: AuthProvider checks auth status on mount; AuthContext stores user and makes available via useAuth hook

**Activity Logging:**
- Backend: ActivityLogService tracks user actions; ActivityLogController provides audit endpoints
- Frontend: User actions trigger API calls that log activity server-side

**Database Transactions:**
- Backend: Transaction utility in `packages/server/src/utils/transaction.ts` wraps multi-step operations for consistency

**Internationalization:**
- Frontend: next-intl for server/client translations; I18nClientProvider wraps app; messages in `packages/web/i18n/messages/`
- Backend: Returns user-facing errors in English; client translates to user's language

**MCP Integration:**
- Backend: McpService and McpController handle Model Context Protocol interactions for AI features
- Frontend: AI-related operations call MCP endpoints via standard API client
