## ADDED Requirements

### Requirement: Versioning via Changesets
The repository SHALL use [Changesets](https://github.com/changesets/changesets) for semver management of all `@transweave/sdk-*` packages. Every PR that modifies SDK code SHALL include at least one `.changeset/*.md` file describing the change and its semver impact.

#### Scenario: PR without changeset is blocked
- **WHEN** a PR modifies any file under `packages/sdk-*` and no `.changeset/*.md` is added
- **THEN** CI SHALL fail with a clear error directing the contributor to run `pnpm changeset`

### Requirement: Automated release on main merge
When PRs merge into the main branch, a Changesets bot SHALL open or update a "Version Packages" release PR aggregating pending changesets. Merging that release PR SHALL trigger npm publish for all changed packages and create a GitHub Release per package.

#### Scenario: Release PR auto-managed
- **WHEN** changesets are accumulated on main
- **THEN** the bot SHALL maintain an open "Version Packages" PR reflecting current pending changes
- **AND** SHALL update CHANGELOGs and bump versions when that PR is merged

### Requirement: CI matrix covers supported runtimes and frameworks
The SDK release workflow SHALL run a build + size-limit + smoke-test matrix:
- Node: 18, 20, 22
- OS: macOS, Ubuntu
- Frameworks per adapter: React 18 / 19 (sdk-react); Vue 3.3+ (sdk-vue); Svelte 4 / 5 (sdk-svelte)

#### Scenario: Matrix failure blocks release
- **WHEN** any matrix cell fails (build error, size-limit breach, smoke test failure)
- **THEN** the release PR merge SHALL NOT publish to npm
