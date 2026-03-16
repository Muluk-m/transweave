## ADDED Requirements

### Requirement: BaseRepository eliminates type assertions
`BaseRepository` SHALL use proper Drizzle ORM generics to eliminate all `as any` type assertions while maintaining the same runtime behavior.

#### Scenario: Type-safe CRUD operations
- **WHEN** a repository method (findById, findAll, create, update, delete) is called
- **THEN** TypeScript SHALL infer correct types without any `as any` casts

#### Scenario: Subclass type inference
- **WHEN** a concrete repository extends `BaseRepository<typeof users>`
- **THEN** the select and insert types SHALL be correctly inferred from the table schema

### Requirement: Unused Prisma dependencies are removed
The `@prisma/client` and `prisma` packages SHALL be removed from `packages/server/package.json`, along with the `prisma:generate` script.

#### Scenario: Server builds without Prisma
- **WHEN** `pnpm build:server` is executed after removing Prisma dependencies
- **THEN** the build SHALL succeed without errors

### Requirement: MCP controller HTML documentation is externalized
The inline HTML documentation string in `mcp.controller.ts` (lines 124-778) SHALL be moved to an external template file.

#### Scenario: MCP documentation endpoint serves content
- **WHEN** the MCP documentation endpoint is accessed
- **THEN** the controller SHALL read and serve the HTML from an external file, producing the same output as before

### Requirement: Seed data is extracted from service layer
The `seed-data.ts` file (4925 lines) SHALL be restructured so that seed data is stored as a separate data file, not embedded in service logic.

#### Scenario: Seed operation uses extracted data
- **WHEN** the seed endpoint is called
- **THEN** the seed service SHALL load data from the extracted data file and insert it into the database
