# Coding Conventions

**Analysis Date:** 2026-03-01

## Naming Patterns

**Files:**
- Controllers: `*.controller.ts` (e.g., `project.controller.ts`, `index.controller.ts`)
- Services: `*.service.ts` (e.g., `project.service.ts`, `user.service.ts`)
- Decorators/Guards/Middleware: Named for their purpose (e.g., `current-user.decorator.ts`, `guard.ts`, `logging.interceptor.ts`)
- Schemas/Models: `*.schema.ts` (e.g., `project.schema.ts`, `user.schema.ts`)
- React components: PascalCase with `.tsx` (e.g., `ProjectTokensTab.tsx`, `TokenTable.tsx`)
- Utility files: Descriptive names (e.g., `validation.ts`, `crypto.ts`, `exportTo.ts`, `importFrom.ts`)
- Test files: `*.spec.ts` for unit tests, `*.e2e-spec.ts` for integration tests

**Functions:**
- camelCase throughout codebase
- Service methods: descriptive verbs (e.g., `createProject`, `findProjectById`, `updateToken`, `deleteProject`)
- React hooks: `use` prefix (e.g., `useDataTable`, `useDebouncedCallback`)
- Public API functions: clearly export with `export function` (e.g., `apiFetch`, `isValidTokenKey`, `validateTokenKey`)

**Variables:**
- camelCase for local variables and constants
- SCREAMING_SNAKE_CASE for configuration constants:
  - `const SALT_LENGTH = 16;`
  - `const ITERATIONS = 100_000;`
  - `const PAGE_KEY = "page";`
  - `const DEBOUNCE_MS = 300;`
- Prefixed state variables: `is*`, `set*` for boolean states (e.g., `isLoading`, `setIsLoading`, `isEditing`, `setIsEditing`)

**Types:**
- PascalCase interfaces and types
- Suffixes for specific purposes:
  - `*Props` for React component props (e.g., `LogoProps`, `ProjectTokensTabProps`)
  - `*Document` for Mongoose documents (e.g., `ProjectDocument`, `TokenDocument`)
  - `*Payload` for authentication/request payloads (e.g., `UserPayload`)
  - `*State` for state types
  - `*Response` for API response types
  - `*Input` for batch operations (e.g., `BatchTokenInput`)

## Code Style

**Formatting:**
- Prettier with config in `packages/server/.prettierrc`:
  - Single quotes: `"singleQuote": true`
  - Trailing commas: `"trailingComma": "all"`
  - Line width: `"printWidth": 120`
- No explicit prettier config for web package (uses defaults via Next.js/ESLint)

**Linting:**

*Server (NestJS):*
- ESLint with flat config: `packages/server/eslint.config.mjs`
- Base configs: `@eslint/js`, `typescript-eslint`, `eslint-plugin-prettier`
- Selected TypeScript rules disabled to allow flexibility:
  - `@typescript-eslint/no-explicit-any`: off
  - `@typescript-eslint/no-floating-promises`: off
  - `@typescript-eslint/no-unsafe-*`: off (multiple rules)
- Unused variables pattern: prefix with underscore to ignore (e.g., `_unused`)

*Web (Next.js):*
- ESLint extends: `"next/core-web-vitals"`
- Minimal custom configuration

## Import Organization

**Order (Server/NestJS):**
1. Node built-in modules (e.g., `'node:crypto'`, `'dotenv/config'`)
2. Third-party frameworks (e.g., `@nestjs/common`, `@nestjs/mongoose`, `mongoose`)
3. Local application imports (e.g., `src/service/`, `src/models/`)

**Example from codebase:**
```typescript
import { randomBytes, pbkdf2Sync } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProjectService } from '../service/project.service';
import { createZipWithLanguageFiles } from 'src/utils/exportTo';
```

**Order (Web/React):**
1. React imports
2. Third-party libraries
3. UI components (from `@/components/ui/`)
4. Custom components and views
5. Utilities and helpers (from `@/lib/`, `@/hooks/`)
6. Types and constants

**Path Aliases:**
- Server: None observed (uses relative imports with `src/` prefix)
- Web: `@/*` points to root (see `packages/web/tsconfig.json`)
  - `@/components/` → components directory
  - `@/lib/` → lib utilities
  - `@/api/` → API calls
  - `@/hooks/` → React hooks
  - `@/jotai/` → state management
  - `@/types/` → type definitions

## Error Handling

**Patterns:**

*Backend (NestJS):*
- Use NestJS exception classes:
  - `NotFoundException` for missing resources
  - `BadRequestException` for invalid input
  - `ForbiddenException` for authorization failures
  - `UnauthorizedException` for authentication failures
- Example:
```typescript
if (!project) {
  throw new NotFoundException('Can not find the project');
}
```
- Utility functions throw `Error` with descriptive messages
- Try-catch blocks in utils catch errors and re-throw with context:
```typescript
try {
  // parse data
} catch (error) {
  throw new Error(`Failed to parse ${format} format file: ${error.message}`);
}
```

*Frontend (React):*
- API wrapper function `apiFetch` returns standardized response:
```typescript
interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}
```
- Components use `useToast()` hook for user-facing errors
- Validation functions return `undefined` on success or error message string on failure

## Logging

**Framework:**
- Backend: NestJS built-in `Logger` class
- Frontend: `console` methods (console.log, console.group, console.groupEnd)

**Patterns:**
- Backend logging interceptor captures all API requests/responses with timing
- Logs include: method, URL, request ID, response status, and timing
- Frontend API wrapper logs requests and response bodies to console groups for debugging
- Activity logging service records user actions with timestamps, user ID, IP address, and operation details

## Comments

**When to Comment:**
- Complex regex patterns get detailed explanation:
```typescript
/**
 * Token key validation regex
 * Rules:
 * - Must start with lowercase letter
 * - Can contain letters (a-z, A-Z) and numbers (0-9)
 * - Can use dot (.) to separate hierarchical levels
 */
const TOKEN_KEY_REGEX = /^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)*$/;
```
- API functions document purpose, parameters, and return values
- Non-obvious business logic gets context comments (e.g., language label comments in Chinese)

**JSDoc/TSDoc:**
- Backend: Uses JSDoc for public functions and utilities
- Frontend: Uses JSDoc for validation functions and public APIs
- Parameter and return types documented explicitly
- Includes examples for complex functions

## Function Design

**Size:**
- Server service methods: 20-80 lines typical
- React component event handlers: Keep below 30 lines, extract complex logic to separate functions
- Utility functions: Keep focused on single responsibility

**Parameters:**
- Use object destructuring for multiple parameters:
```typescript
async createProject(data: {
  name: string;
  teamId: string;
  url: string;
  description?: string;
  languages?: string[];
}) { }
```
- Optional parameters marked with `?`
- Generic type parameters used for reusable utilities

**Return Values:**
- Services return Mongoose documents or plain objects
- Controllers return data directly (NestJS serializes)
- Frontend utils return typed responses with error handling
- Async functions implicitly return Promises

## Module Design

**Exports:**
- Services: Export class decorated with `@Injectable()`
- Controllers: Export class decorated with `@Controller(route)`
- Utilities: Export individual named functions (not default exports)
- React components: Export as named exports or default, both patterns used

**Barrel Files:**
- `packages/server/src/models/index.ts` exports all schemas:
```typescript
export * from './schemas/user.schema';
export * from './schemas/project.schema';
// etc.
```
- `packages/web/constants/index.ts` exports constants
- Reduces import path depth

**Module Pattern (NestJS):**
- Each major feature has corresponding service, controller
- Centralized in `AppModule` for dependency injection
- Database module isolated in `modules/database.module.ts`

---

*Convention analysis: 2026-03-01*
