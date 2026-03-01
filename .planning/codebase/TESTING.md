# Testing Patterns

**Analysis Date:** 2026-03-01

## Test Framework

**Runner:**
- Jest 29.7.0
- Config: inline in `packages/server/package.json` under `"jest"` key
- Separate E2E config: `packages/server/test/jest-e2e.json`

**Assertion Library:**
- Jest built-in assertions (`expect`, `toBe`, `toEqual`, etc.)

**Run Commands:**
```bash
npm run test                # Run all unit tests matching **/*.spec.ts
npm run test:watch         # Watch mode for development
npm run test:cov           # Generate coverage report
npm run test:debug         # Debug tests with Node inspector
npm run test:e2e           # Run E2E tests with separate config
```

## Test File Organization

**Location:**
- Unit tests: Co-located with source code
- Example: Test file `packages/server/src/controller/index.controller.spec.ts` lives alongside `packages/server/src/controller/index.controller.ts`
- E2E tests: Separate directory in `packages/server/test/`

**Naming:**
- Unit tests: `*.spec.ts` suffix
- E2E tests: `*.e2e-spec.ts` suffix
- Matches Jest regex: `testRegex: ".*\\.spec\\.ts$"` (unit) and `.e2e-spec.ts$` (E2E)

**Structure:**
```
packages/server/
├── src/
│   ├── controller/
│   │   ├── index.controller.ts
│   │   └── index.controller.spec.ts
│   ├── service/
│   │   └── project.service.ts      # (no test file found)
│   └── ...
└── test/
    ├── app.e2e-spec.ts
    └── jest-e2e.json
```

## Test Structure

**Suite Organization:**

Unit test example from `packages/server/src/controller/index.controller.spec.ts`:
```typescript
describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
```

**Patterns:**
- `describe()` blocks organize tests by component/feature
- Nested `describe()` for method-level organization
- `beforeEach()` sets up test module and dependencies per test
- `it()` defines individual test cases

E2E test example from `packages/server/test/app.e2e-spec.ts`:
```typescript
describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });
});
```

## Mocking

**Framework:**
- `@nestjs/testing` provides `Test.createTestingModule()` for DI setup
- `supertest` for HTTP testing in E2E tests

**Patterns:**
```typescript
// Unit test - Mock providers
const app: TestingModule = await Test.createTestingModule({
  controllers: [AppController],
  providers: [AppService],  // Real provider (no mock)
}).compile();

// E2E test - Mock entire module
const moduleFixture = await Test.createTestingModule({
  imports: [AppModule],  // Real module with all dependencies
}).compile();

// Supertest for HTTP assertions
return request(app.getHttpServer())
  .get('/')
  .expect(200)
  .expect('Hello World!');
```

**What to Mock:**
- External services should be mocked with Jest mock functions
- Database calls should use test database or in-memory storage
- HTTP calls via `axios` should be intercepted

**What NOT to Mock:**
- Core business logic of the service being tested
- Direct dependencies that are part of the contract
- Middleware and guards that are critical to the flow

## Fixtures and Factories

**Test Data:**
- Not extensively used in current test suite
- Consider creating factories for:
  - Mock user objects with required `UserPayload` fields
  - Mock project data for integration testing
  - Mock token responses

**Location:**
- Would typically go in `packages/server/test/fixtures/` or `packages/server/test/factories/`
- No fixtures directory currently present

**Pattern to follow:**
```typescript
// Hypothetical factory example
export function createMockProject(overrides = {}) {
  return {
    name: 'Test Project',
    teamId: 'test-team-123',
    url: 'https://example.com',
    languages: ['en', 'zh'],
    ...overrides,
  };
}
```

## Coverage

**Requirements:**
- No explicit coverage threshold enforced
- Jest configured to collect coverage from all `.ts` and `.js` files:
  ```json
  "collectCoverageFrom": ["**/*.(t|j)s"]
  ```
- Coverage directory: `../coverage` (relative to `packages/server/`)

**View Coverage:**
```bash
npm run test:cov
# Opens coverage/lcov-report/index.html in browser
# Or view via: open coverage/lcov-report/index.html
```

## Test Types

**Unit Tests:**
- Scope: Single class/function in isolation
- Approach: Mock all external dependencies using NestJS TestingModule
- Location: Co-located with source (e.g., `controller.spec.ts` next to `controller.ts`)
- Example: `packages/server/src/controller/index.controller.spec.ts` tests AppController methods

**Integration Tests:**
- Scope: Multiple components working together (service + controller + database)
- Approach: Create full TestingModule with real providers, mock only external services
- Location: In `src/` directory with test files
- Currently: Limited integration tests; focus is on E2E

**E2E Tests:**
- Scope: Full application flow from HTTP request to response
- Framework: `supertest` with real NestJS app instance
- Approach: Import entire `AppModule`, test via HTTP requests
- Location: `packages/server/test/` directory with separate Jest config
- Example: `packages/server/test/app.e2e-spec.ts` tests HTTP GET / endpoint
- Run with: `npm run test:e2e`

## Common Patterns

**Async Testing:**
```typescript
// Jest automatically handles Promise returns
it('should create project', async () => {
  const result = await appService.createProject(data);
  expect(result).toBeDefined();
});

// Or use return with supertest
it('/ (GET)', () => {
  return request(app.getHttpServer())
    .get('/')
    .expect(200);
});
```

**Error Testing:**
```typescript
// Expected to throw
it('should throw NotFoundException', async () => {
  await expect(
    appController.findProjectById('invalid-id')
  ).rejects.toThrow(NotFoundException);
});

// HTTP error response
it('should return 404', () => {
  return request(app.getHttpServer())
    .get('/invalid-route')
    .expect(404);
});
```

## Current Test Coverage

**Tested:**
- `AppController.getHello()` - Unit test
- `GET /` endpoint - E2E test

**Gaps:**
- No tests for service business logic (ProjectService, UserService, etc.)
- No tests for error handling flows
- No tests for authentication/JWT validation
- No tests for database operations
- No tests for utility functions (importFrom, exportTo, crypto, etc.)
- No tests for React components in web package

**Recommended Priority for New Tests:**
1. Service layer tests (ProjectService, UserService, TeamService)
2. Authentication flow (JWT validation, guard testing)
3. Database operations (transactions, error handling)
4. API endpoints (create, update, delete operations)
5. Utility function edge cases (validation, parsing)

---

*Testing analysis: 2026-03-01*
