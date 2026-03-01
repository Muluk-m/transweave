# Codebase Concerns

**Analysis Date:** 2026-03-01

## Tech Debt

**Unsafe Type Casting and `any` Usage:**
- Issue: Widespread use of `any` type in data processing utilities and components, bypassing TypeScript type safety. Files use `/* eslint-disable @typescript-eslint/no-unsafe-* */` to suppress warnings.
- Files: `src/utils/exportTo.ts`, `src/utils/importFrom.ts`, `src/service/project.service.ts`, `packages/web/components/views/projectView/ProjectTokensTab/index.tsx`
- Impact: Runtime errors not caught at compile time, difficult refactoring, reduced code maintainability
- Fix approach: Replace `any` with proper type definitions. Create strict types for import/export data structures. Remove ESLint suppressions and fix underlying type issues.

**Legacy Data Format Migration Logic Embedded in Production Code:**
- Issue: Auto-migration of old module format (string[] to ProjectModule[]) happens inline during project retrieval with console.log statements
- Files: `packages/server/src/service/project.service.ts:101-102`
- Impact: Silent data transformation without explicit migration process, adds complexity to read operations, hard to track and test
- Fix approach: Extract migration logic to dedicated migration functions. Use database migration tool or explicit migration endpoints. Remove from hot read path.

**Console.log Statements in Production Code:**
- Issue: Multiple console.log and console.error calls scattered throughout codebase without centralized logging
- Files: `packages/server/src/service/project.service.ts`, `packages/server/src/service/mongoose.service.ts`, `packages/web/components/views/projectView/ProjectTokensTab/index.tsx`, and 14+ web components
- Impact: Inconsistent logging, difficult debugging, no log levels or formatting, can expose sensitive data in logs
- Fix approach: Replace all console calls with Logger service. Implement centralized logging with levels (debug/info/warn/error).

**Hardcoded External Service URLs:**
- Issue: CDN upload endpoint hardcoded as string literal in upload API client
- Files: `packages/web/api/upload.ts:21, 56`
- Impact: Cannot change upload endpoint without code changes, difficult to support multiple environments
- Fix approach: Move URLs to environment configuration or API layer configuration service.

## Known Bugs

**Null Pointer Risk in Token Error Handling:**
- Symptoms: Returning generic error message "Project {token.projectId} does not exist" when token or projectId could be null
- Files: `packages/server/src/controller/project.controller.ts:196, 226, 247`
- Trigger: Call getToken/updateToken/deleteToken with invalid tokenId that returns token without projectId
- Workaround: Check backend error handling logic confirms null checks, but error message is misleading

**Potential Race Condition in Session-Based Transactions:**
- Symptoms: Multiple sequential operations using sessions without proper error boundaries
- Files: `packages/server/src/service/project.service.ts:44-78` (createProject), `packages/server/src/service/project.service.ts:241-282` (deleteProject)
- Trigger: High concurrency on same project during creation/deletion
- Impact: Session could be orphaned if transaction fails, leading to connection leak

## Security Considerations

**Missing Input Validation on API Endpoints:**
- Risk: @Body parameters accepted without validation pipes or DTOs with decorators
- Files: `packages/server/src/controller/project.controller.ts` (67 instances of @Body/@Param/@Query without validators)
- Current mitigation: Minimal - relies on TypeScript types only
- Recommendations: Add class-validator decorators, implement ValidationPipe globally, validate file uploads, sanitize string inputs

**Token Transmission Over Unencrypted Headers (Frontend):**
- Risk: Auth token stored in localStorage and sent via Authorization header without explicit HTTPS requirement
- Files: `packages/web/api/upload.ts:25`
- Current mitigation: Bearer token format, but no HTTPS enforcement in code
- Recommendations: Enforce HTTPS at environment level, use HttpOnly cookies instead of localStorage, implement token refresh strategy

**File Upload to External CDN Without Type/Size Validation:**
- Risk: uploadImage/uploadFiles accept any File object without checking MIME type or size limits
- Files: `packages/web/api/upload.ts:17-72`
- Current mitigation: External CDN service might validate, but client-side has no checks
- Recommendations: Validate file type (MIME), implement file size limits before upload, whitelist allowed extensions

**Unvalidated Project ID in Bulk Operations:**
- Risk: Batch token operations accept projectId from request body without re-verifying ownership
- Files: `packages/server/src/controller/project.controller.ts:165-188` (createToken), similar pattern in batch operations
- Current mitigation: Permission check exists but happens after processing begins
- Recommendations: Validate ownership before processing any token mutations, implement rate limiting on bulk operations

## Performance Bottlenecks

**Large Service File Complexity:**
- Problem: ProjectService handles 1466 lines - project CRUD, tokens, modules, export/import, activity logging, all mixed
- Files: `packages/server/src/service/project.service.ts`
- Cause: Single service handles too many responsibilities, no separation of concerns
- Improvement path: Extract TokenService, ExportService, ImportService, ActivityService into separate classes. Reduce ProjectService to CRUD operations only.

**No Pagination on Project Listing:**
- Problem: findAllProjects returns all projects without limits, could cause memory/response bloat
- Files: `packages/server/src/service/project.service.ts:81`, `packages/server/src/controller/project.controller.ts:56-59`
- Cause: Simple .find() without query filters or limits
- Improvement path: Add pagination parameters (limit, offset/cursor), implement query builder with optional filters

**Import Processing Without Streaming:**
- Problem: Large import files loaded entirely into memory, processed in single pass
- Files: `packages/server/src/utils/importFrom.ts` (410 lines), all parsing functions use string parameters
- Cause: No streaming or chunking mechanism for large files
- Improvement path: Implement streaming parser for CSV/XML/JSON, process in chunks, handle backpressure

**Synchronous String Parsing in API Request Path:**
- Problem: parseImportDataMultiLanguage processes entire file content synchronously on main thread during HTTP request
- Files: `packages/server/src/utils/importFrom.ts:33-53`
- Cause: No async processing or queue system
- Improvement path: Offload to worker thread or background job queue for large files, return job status endpoint

## Fragile Areas

**Export Format Conversion Logic:**
- Files: `packages/server/src/utils/exportTo.ts` (288 lines)
- Why fragile: Supports 4 formats (JSON/CSV/XML/YAML) with special handling for nested keys with dots, no comprehensive test coverage, any change to key parsing affects all formats simultaneously
- Safe modification: Add comprehensive test suite covering edge cases (special chars, null values, empty arrays), create format-specific test fixtures before refactoring
- Test coverage: No test files found for export/import utilities

**MCP Session Management:**
- Files: `packages/server/src/controller/mcp.controller.ts:1-80`
- Why fragile: Manual session tracking with Map, transport lifecycle tied to HTTP request, sessionId generation delegated to SDK library, onclose callback manages cleanup
- Safe modification: Add comprehensive logging around session lifecycle, implement timeout-based cleanup, store session metadata for debugging
- Test coverage: No test coverage for session edge cases (session timeout, duplicate requests, orphaned sessions)

**Authentication Guard Implementation:**
- Files: `packages/server/src/jwt/guard.ts` (strategy pattern with passport)
- Why fragile: Relies on JWT token format, no validation of token expiration or refresh logic visible in guards
- Safe modification: Add comprehensive auth tests, implement token refresh rotation, add rate limiting on auth endpoints
- Test coverage: Single test file exists but likely incomplete

**Token-Permission Coupling:**
- Files: `packages/server/src/controller/project.controller.ts:150-255` (token operations)
- Why fragile: Permission check done in controller per-operation, no abstraction layer, duplicated permission check code across endpoints
- Safe modification: Create authorization middleware/decorator to centralize permission logic, make it reusable
- Test coverage: No test files for controller permission logic

## Scaling Limits

**Session Map Growth Without Eviction:**
- Current capacity: Unbounded number of active MCP sessions stored in memory Map
- Limit: Memory fills up after prolonged usage without server restart, no cleanup for orphaned sessions
- Scaling path: Implement session expiration TTL, add configurable max session limit with LRU eviction, persist sessions to Redis for multi-instance deployments

**No Database Connection Pooling Configuration:**
- Current capacity: Mongoose default connection pool (default 10 connections)
- Limit: Cannot handle spike in concurrent requests beyond pool size
- Scaling path: Configure connection pool size based on deployment target, implement connection timeout handling, consider connection pooling at reverse proxy level

**Activity Log Unbounded Growth:**
- Current capacity: All project/token operations logged to ActivityLog collection with no retention policy
- Limit: Database size grows indefinitely, queries slow down with document count
- Scaling path: Implement log rotation/archival, add TTL indexes on old logs, partition collection by date

## Dependencies at Risk

**Mongoose 8.14.0 with Implicit Connection Management:**
- Risk: Schema validation and connection pooling implicit, difficult to debug connection issues
- Impact: Silent connection failures, cascading errors in dependent services
- Migration plan: Consider migration to Prisma (already in devDependencies) for type-safe explicit queries, or document Mongoose configuration requirements

**Passport JWT 4.0.1 with Manual Token Validation:**
- Risk: JWT validation logic in strategy file, no built-in token refresh or revocation
- Impact: Expired tokens not refreshed automatically, revoked tokens still valid until expiration
- Migration plan: Implement token refresh endpoint, add token blacklist for revocation, consider OAuth2 library for more features

**Directly Using `any` in SDK Integration:**
- Risk: @modelcontextprotocol/sdk response types treated as any
- Impact: Impossible to validate MCP server responses, random failures from malformed responses
- Migration plan: Contribute types to SDK or create wrapper types, validate response schemas at boundaries

## Missing Critical Features

**No Test Suite:**
- Problem: Only 1 test file found in entire monorepo (controller.spec.ts), zero test coverage for critical services
- Blocks: Cannot safely refactor, no regression detection, cannot verify security fixes
- Impact: High risk for introducing bugs in production

**No Validation Framework:**
- Problem: API endpoints accept @Body/@Param without input validation or schema validation
- Blocks: Cannot verify incoming data format, no protection against malformed requests
- Impact: High risk of runtime errors from invalid input

**No Rate Limiting or Throttling:**
- Problem: No rate limit implementation on API endpoints or file upload operations
- Blocks: System vulnerable to abuse, batch operations not protected
- Impact: Resource exhaustion possible

**No Error Tracking/Monitoring:**
- Problem: Errors logged to console only, no aggregation or alerting
- Blocks: Cannot detect production errors in real-time, no error trend analysis
- Impact: User-facing errors may go unnoticed

**No Database Schema Migration System:**
- Problem: Mongoose models directly connected to collections, no versioned migrations
- Blocks: Cannot safely evolve schema, rollback not possible
- Impact: High risk when deploying schema changes

## Test Coverage Gaps

**Service Layer Completely Untested:**
- What's not tested: ProjectService (1466 lines), TokenService operations, MCP service, auth service, team service, activity logging
- Files: `packages/server/src/service/`
- Risk: Cannot safely refactor or optimize service logic, bugs in business logic not caught
- Priority: Critical - services contain core business logic

**Controller Authorization Logic Untested:**
- What's not tested: Permission checks on all endpoints, forbidden/unauthorized responses, authorization edge cases
- Files: `packages/server/src/controller/project.controller.ts:140-255` (70+ permission-related lines)
- Risk: Authorization bypass possible, security regression not detected
- Priority: Critical - security-critical code

**Import/Export Utilities No Test Coverage:**
- What's not tested: All format parsing (JSON/CSV/XML/YAML), edge cases with special characters, malformed input handling
- Files: `packages/server/src/utils/importFrom.ts:410 lines`, `packages/server/src/utils/exportTo.ts:288 lines`
- Risk: Data corruption or loss during import/export silently occurs
- Priority: High - data integrity issue

**Frontend Component State Management Untested:**
- What's not tested: Complex form state in ProjectTokensTab (1466 lines), batch operations, error handling flows
- Files: `packages/web/components/views/projectView/ProjectTokensTab/index.tsx`
- Risk: UI bugs in data modification flows, race conditions in batch updates
- Priority: High - user-facing complex operations

**Database Connection and Transaction Flow Not Tested:**
- What's not tested: Session management, transaction rollback scenarios, connection failures
- Files: `packages/server/src/service/project.service.ts:44-78, 241-282`
- Risk: Data inconsistency in failure scenarios, orphaned sessions
- Priority: High - data consistency issue

---

*Concerns audit: 2026-03-01*
