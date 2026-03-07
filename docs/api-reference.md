# Transweave REST API Reference

**Base URL:** `http://localhost:3001` (configurable via the `PORT` environment variable)

> This documents the current API surface. No versioned prefix is used yet. All endpoints are prefixed with `/api`.

---

## Table of Contents

- [Authentication](#authentication)
  - [JWT Authentication](#jwt-authentication)
  - [API Key Authentication](#api-key-authentication)
- [Auth Endpoints](#auth-endpoints)
- [Users](#users)
- [Teams](#teams)
- [Projects](#projects)
- [Translation Tokens](#translation-tokens)
- [Import & Export](#import--export)
- [API Keys](#api-keys)
- [AI Translation](#ai-translation)
- [AI Configuration](#ai-configuration)
- [Activity Logs](#activity-logs)
- [MCP Server](#mcp-server)
- [CLI Quick Reference](#cli-quick-reference)

---

## Authentication

Most endpoints require authentication. The platform supports two authentication methods, and most protected endpoints accept either one transparently.

### JWT Authentication

Obtain a JWT by logging in, then include it in the `Authorization` header.

```bash
# Step 1: Log in
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "yourpassword"}'

# Response:
# { "success": true, "message": "Login successful", "token": "eyJhbG...", "user": { ... } }

# Step 2: Use the token
curl http://localhost:3001/api/user/me \
  -H "Authorization: Bearer eyJhbG..."
```

### API Key Authentication

Generate an API key from the web UI at `/settings/api-keys` or via the API key endpoint. API keys use the `tw_` prefix.

```bash
# Step 1: Create an API key (requires JWT auth)
curl -X POST http://localhost:3001/api/api-keys \
  -H "Authorization: Bearer eyJhbG..." \
  -H "Content-Type: application/json" \
  -d '{"name": "my-cli-key"}'

# Response:
# { "success": true, "apiKey": { "id": "...", "fullKey": "tw_abc12345...", ... } }
# NOTE: The full key is only shown once at creation time. Store it securely.

# Step 2: Use the API key (same header format)
curl http://localhost:3001/api/user/me \
  -H "Authorization: Bearer tw_abc12345..."
```

### Common Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token/API key |
| `403 Forbidden` | Authenticated but lacking permission for this resource |

---

## Auth Endpoints

Base path: `/api/auth`

### POST /api/auth/register

Register a new user account.

- **Auth:** Public

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Display name |
| `email` | `string` | Yes | Email address |
| `password` | `string` | Yes | Password |
| `avatar` | `string` | Yes | Avatar URL |

**Response (200):**
```json
{
  "success": true,
  "message": "Registration successful",
  "token": "eyJhbG...",
  "user": { "id": "...", "name": "...", "email": "..." }
}
```

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "email": "alice@example.com", "password": "secret123", "avatar": ""}'
```

---

### POST /api/auth/login

Log in with email and password.

- **Auth:** Public

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | `string` | Yes | Email address |
| `password` | `string` | Yes | Password |

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbG...",
  "user": { "id": "...", "name": "...", "email": "..." }
}
```

---

### GET /api/auth/status

Check if the current token is valid and return user info.

- **Auth:** Required (JWT or API key)

**Response (200):**
```json
{
  "status": "authenticated",
  "user": { "userId": "...", "email": "...", "name": "..." }
}
```

---

### POST /api/auth/token

Generate a long-lived JWT token (expires in 9 years). Useful for CI/CD or long-running integrations.

- **Auth:** Required (JWT or API key)

**Response (200):**
```json
{
  "success": true,
  "message": "Token generated",
  "token": "eyJhbG..."
}
```

---

### GET /api/auth/setup/status

Check whether initial setup is needed (i.e., no users exist yet).

- **Auth:** Public

**Response (200):**
```json
{ "needsSetup": true }
```

---

### POST /api/auth/setup

Perform first-run setup: create the initial admin user and default team.

- **Auth:** Public (only works when no users exist)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Admin display name |
| `email` | `string` | Yes | Admin email |
| `password` | `string` | Yes | Admin password |
| `teamName` | `string` | Yes | Default team name |

**Response (200):**
```json
{
  "success": true,
  "token": "eyJhbG...",
  "user": { "id": "...", "name": "...", "email": "..." }
}
```

---

## Users

Base path: `/api/user`

### GET /api/user/me

Get the current authenticated user's profile.

- **Auth:** Required

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Alice",
  "email": "alice@example.com",
  "avatar": "",
  "createdAt": "2026-01-15T10:00:00.000Z"
}
```

```bash
curl http://localhost:3001/api/user/me \
  -H "Authorization: Bearer eyJhbG..."
```

---

### GET /api/user/search?keyword=

Search users by name or email.

- **Auth:** Required

| Query Param | Type | Required | Description |
|-------------|------|----------|-------------|
| `keyword` | `string` | Yes | Search term |

**Response (200):** Array of matching user objects.

---

### GET /api/user/:id

Get a specific user by ID. Excludes the password field.

- **Auth:** Required

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Alice",
  "email": "alice@example.com",
  "avatar": ""
}
```

---

### PUT /api/user/:id/reset-password

Admin-only: reset another user's password.

- **Auth:** Required (must be admin)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `newPassword` | `string` | Yes | New password |

**Response (200):**
```json
{ "success": true, "message": "Password reset successful" }
```

---

### DELETE /api/user/:id

Delete a user account. Users can only delete their own account.

- **Auth:** Required (self only)

---

## Teams

Base path: `/api/team`

### POST /api/team/create

Create a new team. The calling user becomes the owner.

- **Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Team name |
| `url` | `string` | Yes | Team URL/slug |

**Response (200):** The created team object.

```bash
curl -X POST http://localhost:3001/api/team/create \
  -H "Authorization: Bearer eyJhbG..." \
  -H "Content-Type: application/json" \
  -d '{"name": "My Team", "url": "my-team"}'
```

---

### GET /api/team/all

List all teams the current user is a member of.

- **Auth:** Required

**Response (200):** Array of team objects.

---

### GET /api/team/all/superadmin

List all teams in the system (admin only).

- **Auth:** Required (must be admin)

**Response (200):** Array of all team objects.

---

### GET /api/team/list

List teams for the current user (alternative to `/all`).

- **Auth:** Required

**Response (200):** Array of team objects.

---

### GET /api/team/find/:id

Get a team by ID. Requires team membership.

- **Auth:** Required (team member)

**Response (200):** Team object.

---

### PUT /api/team/update/:id

Update team details. Requires manager or owner role.

- **Auth:** Required (manager or owner)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | No | New team name |
| `url` | `string` | No | New team URL/slug |

---

### DELETE /api/team/delete/:id

Delete a team. Requires owner role.

- **Auth:** Required (owner only)

---

### POST /api/team/addmember/:id

Add a member to a team.

- **Auth:** Required (manager or owner)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | `string` | Yes | User ID to add |
| `role` | `string` | Yes | Role: `"owner"`, `"manager"`, or `"member"` |

> Only team owners can assign the `owner` role.

---

### PUT /api/team/updatemember/:id/:memberId

Update a team member's role.

- **Auth:** Required (owner, manager, or admin)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `role` | `string` | Yes | New role: `"owner"`, `"manager"`, or `"member"` |

> Only owners or admins can promote to `owner`.

---

### DELETE /api/team/removemembers/:id/:memberId

Remove a member from a team. Cannot remove owners.

- **Auth:** Required (manager or owner)

---

### GET /api/team/members/:id

List all members of a team.

- **Auth:** Required (team member)

**Response (200):** Array of membership objects with user details.

---

### GET /api/team/check/:id

Check whether the current user is a member of a team.

- **Auth:** Required

**Response (200):** `true` or `false`

---

## Projects

Base path: `/api/project`

### POST /api/project/create

Create a new project under a team.

- **Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Project name |
| `teamId` | `string` | Yes | Team ID |
| `url` | `string` | Yes | Project URL/slug |
| `description` | `string` | No | Project description |
| `languages` | `string[]` | No | Initial language codes (e.g., `["en", "zh-CN"]`) |

**Response (200):** The created project object.

```bash
curl -X POST http://localhost:3001/api/project/create \
  -H "Authorization: Bearer eyJhbG..." \
  -H "Content-Type: application/json" \
  -d '{"name": "My App", "teamId": "uuid", "url": "my-app", "languages": ["en", "zh-CN"]}'
```

---

### GET /api/project/all

List all projects.

- **Auth:** Public

**Response (200):** Array of project objects.

---

### GET /api/project/find/:id

Get a single project by ID, including team membership data.

- **Auth:** Public

**Response (200):** Project object with `memberships` array.

---

### PUT /api/project/update/:id

Update project details.

- **Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | No | Project name |
| `description` | `string` | No | Description |
| `languages` | `string[]` | No | Language codes |
| `languageLabels` | `Record<string, string>` | No | Custom language labels |
| `modules` | `Array<{ name: string; code: string }>` | No | Module definitions |
| `url` | `string` | No | Project URL |

---

### DELETE /api/project/delete/:id

Delete a project.

- **Auth:** Required

---

### GET /api/project/team/:teamId

List all projects belonging to a team.

- **Auth:** Required

---

### POST /api/project/language/:id

Add a language to a project.

- **Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `language` | `string` | Yes | Language code (e.g., `"ja"`) |

---

### DELETE /api/project/language/:id/:language

Remove a language from a project.

- **Auth:** Required

---

### POST /api/project/module/:id

Add a module to a project.

- **Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Module display name |
| `code` | `string` | Yes | Module code identifier |

---

### DELETE /api/project/module/:id/:module

Remove a module from a project.

- **Auth:** Required

---

### GET /api/project/check/:id

Check if the current user has permission to access a project.

- **Auth:** Required

**Response (200):** `true` or `false`

---

## Translation Tokens

Base path: `/api/tokens`

### POST /api/tokens

Create a new translation token.

- **Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `projectId` | `string` | Yes | Project ID |
| `key` | `string` | Yes | Token key (e.g., `"common.save"`) |
| `module` | `string` | No | Module code |
| `tags` | `string[]` | No | Tags |
| `comment` | `string` | No | Comment/description |
| `translations` | `Record<string, string>` | No | Translation values (e.g., `{"en": "Save", "zh-CN": "..."}`) |
| `screenshots` | `string[]` | No | Screenshot URLs |

**Response (200):** The created token object.

```bash
curl -X POST http://localhost:3001/api/tokens \
  -H "Authorization: Bearer tw_abc12345..." \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "uuid",
    "key": "common.save",
    "translations": {"en": "Save", "zh-CN": "保存"},
    "tags": ["common"]
  }'
```

---

### GET /api/tokens/:projectId

Get all tokens for a project.

- **Auth:** Required

**Response (200):** Array of token objects with history.

---

### GET /api/tokens/detail/:tokenId

Get a single token by ID with full history.

- **Auth:** Required

**Response (200):**
```json
{
  "id": "uuid",
  "key": "common.save",
  "module": "core",
  "translations": { "en": "Save", "zh-CN": "保存" },
  "tags": ["common"],
  "comment": "Save button text",
  "screenshots": [],
  "projectId": "uuid",
  "history": [ ... ],
  "createdAt": "2026-01-15T10:00:00.000Z",
  "updatedAt": "2026-01-15T12:00:00.000Z"
}
```

---

### PUT /api/tokens/:tokenId

Update an existing token.

- **Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `key` | `string` | No | New key |
| `module` | `string` | No | Module code |
| `tags` | `string[]` | No | Tags |
| `comment` | `string` | No | Comment |
| `translations` | `Record<string, string>` | No | Translation values |
| `screenshots` | `string[]` | No | Screenshot URLs |

---

### DELETE /api/tokens/:tokenId

Delete a token.

- **Auth:** Required

---

### GET /api/tokens/:projectId/search

Search and filter tokens with pagination.

- **Auth:** Required

| Query Param | Type | Default | Description |
|-------------|------|---------|-------------|
| `q` | `string` | - | Search query (matches key and translation values) |
| `module` | `string` | - | Filter by module code |
| `status` | `"all" \| "completed" \| "incomplete"` | `"all"` | Filter by translation completion status |
| `language` | `string` | - | Language code for status filtering |
| `tags` | `string` | - | Comma-separated tag list |
| `page` | `number` | `1` | Page number |
| `perPage` | `number` | `50` | Items per page (max 200) |
| `sortBy` | `string` | `"createdAt"` | Sort field |
| `sortOrder` | `"asc" \| "desc"` | `"desc"` | Sort direction |

**Response (200):**
```json
{
  "tokens": [ ... ],
  "total": 142,
  "page": 1,
  "perPage": 50,
  "totalPages": 3
}
```

```bash
curl "http://localhost:3001/api/tokens/PROJECT_ID/search?q=save&module=core&page=1&perPage=20" \
  -H "Authorization: Bearer tw_abc12345..."
```

---

### GET /api/tokens/:projectId/progress

Get per-language translation completion percentages.

- **Auth:** Required

**Response (200):** Language completion statistics.

---

### GET /api/tokens/:tokenId/history

Get the change history for a specific token.

- **Auth:** Required

**Response (200):** Array of history entries.

---

### POST /api/tokens/bulk

Perform bulk operations on multiple tokens.

- **Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tokenIds` | `string[]` | Yes | Token IDs to operate on |
| `operation` | `"delete" \| "set-tags" \| "set-module"` | Yes | Operation type |
| `payload` | `object` | Conditional | Required for `set-tags` and `set-module` |
| `payload.tags` | `string[]` | For `set-tags` | Tags to set |
| `payload.module` | `string \| null` | For `set-module` | Module code or `null` to clear |

```bash
# Bulk delete
curl -X POST http://localhost:3001/api/tokens/bulk \
  -H "Authorization: Bearer tw_abc12345..." \
  -H "Content-Type: application/json" \
  -d '{"tokenIds": ["id1", "id2"], "operation": "delete"}'

# Bulk set tags
curl -X POST http://localhost:3001/api/tokens/bulk \
  -H "Authorization: Bearer tw_abc12345..." \
  -H "Content-Type: application/json" \
  -d '{"tokenIds": ["id1", "id2"], "operation": "set-tags", "payload": {"tags": ["ui", "v2"]}}'
```

---

## Import & Export

Base path: `/api/project`

### POST /api/project/export/:projectId

Export project translations as a ZIP file.

- **Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `format` | `string` | Yes | Export format: `"json"`, `"csv"`, `"xml"`, `"yaml"`, `"xliff"`, or `"po"` |
| `scope` | `string` | No | `"all"`, `"completed"`, `"incomplete"`, or `"custom"` |
| `languages` | `string[]` | No | Language codes to include |
| `showEmptyTranslations` | `boolean` | No | Include empty translation values |
| `prettify` | `boolean` | No | Pretty-print output |
| `includeMetadata` | `boolean` | No | Include metadata in output |

**Response:** Binary ZIP file with `Content-Type: application/zip`.

```bash
curl -X POST http://localhost:3001/api/project/export/PROJECT_ID \
  -H "Authorization: Bearer eyJhbG..." \
  -H "Content-Type: application/json" \
  -d '{"format": "json", "scope": "all", "prettify": true}' \
  -o translations.zip
```

---

### GET /api/project/download/:projectId

Download translations directly via URL (browser-friendly, no JWT needed).

- **Auth:** Username/password via query params

| Query Param | Type | Required | Description |
|-------------|------|----------|-------------|
| `format` | `string` | No | Export format (default: `"json"`) |
| `scope` | `string` | No | Export scope (default: `"all"`) |
| `languages` | `string` | No | Comma-separated language codes |
| `showEmptyTranslations` | `string` | No | `"true"` or `"false"` |
| `prettify` | `string` | No | `"true"` or `"false"` |
| `includeMetadata` | `string` | No | `"true"` or `"false"` |
| `username` | `string` | Yes | Email address |
| `password` | `string` | Yes | Password |

**Response:** Binary ZIP file.

```bash
curl "http://localhost:3001/api/project/download/PROJECT_ID?format=json&languages=en,zh-CN&username=user@example.com&password=secret" \
  -o translations.zip
```

---

### POST /api/project/import/preview/:projectId

Preview what an import would change before applying it.

- **Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `language` | `string` | Yes | Target language code |
| `content` | `string` | Yes | File content as string |
| `format` | `string` | Yes | Import format: `"json"`, `"csv"`, `"xml"`, `"yaml"`, `"xliff"`, or `"po"` |
| `mode` | `string` | Yes | `"append"` (add new only) or `"replace"` (overwrite existing) |

**Response (200):**
```json
{
  "success": true,
  "changes": { "added": 5, "modified": 3, "unchanged": 42, "details": [ ... ] }
}
```

---

### POST /api/project/import/:projectId

Import translations into a project.

- **Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `language` | `string` | Yes | Target language code |
| `content` | `string` | Yes | File content as string |
| `format` | `string` | Yes | Import format: `"json"`, `"csv"`, `"xml"`, `"yaml"`, `"xliff"`, or `"po"` |
| `mode` | `string` | Yes | `"append"` or `"replace"` |

**Response (200):**
```json
{
  "success": true,
  "added": 5,
  "modified": 3,
  "unchanged": 42
}
```

```bash
curl -X POST http://localhost:3001/api/project/import/PROJECT_ID \
  -H "Authorization: Bearer eyJhbG..." \
  -H "Content-Type: application/json" \
  -d '{
    "language": "en",
    "content": "{\"common.save\": \"Save\", \"common.cancel\": \"Cancel\"}",
    "format": "json",
    "mode": "append"
  }'
```

---

### POST /api/project/migrate-languages/:projectId

Migrate language codes in a project (e.g., rename `zh` to `zh-CN`).

- **Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `languageMapping` | `Record<string, string>` | Yes | Map of old codes to new codes |

**Response (200):**
```json
{ "success": true, "migratedTokens": 150, "languagesUpdated": 2 }
```

---

## API Keys

Base path: `/api/api-keys`

### POST /api/api-keys

Create a new API key. The full key is returned **only once** at creation time.

- **Auth:** Required (JWT)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Descriptive name for the key |
| `scopes` | `string[]` | No | Permission scopes (reserved for future use) |
| `expiresAt` | `string` | No | ISO 8601 expiration date |

**Response (200):**
```json
{
  "success": true,
  "apiKey": {
    "id": "uuid",
    "name": "my-cli-key",
    "prefix": "tw_abc12345",
    "fullKey": "tw_abc12345...",
    "createdAt": "2026-01-15T10:00:00.000Z"
  }
}
```

```bash
curl -X POST http://localhost:3001/api/api-keys \
  -H "Authorization: Bearer eyJhbG..." \
  -H "Content-Type: application/json" \
  -d '{"name": "ci-deploy-key", "expiresAt": "2027-01-01T00:00:00Z"}'
```

---

### GET /api/api-keys

List all API keys for the current user. Does **not** return the full key or hash.

- **Auth:** Required

**Response (200):** Array of API key metadata objects.

---

### DELETE /api/api-keys/:id

Revoke (delete) an API key. Users can only delete their own keys.

- **Auth:** Required

**Response (200):**
```json
{ "success": true }
```

---

## AI Translation

Base path: `/api/ai`

All AI endpoints require authentication and an AI provider to be configured at the team or project level.

### POST /api/ai/translate

Translate text using the configured AI provider.

- **Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | `string` | Yes | Source text to translate |
| `from` | `string` | Yes | Source language code |
| `to` | `string[]` | Yes | Target language codes |
| `projectId` | `string` | Yes | Project ID (determines which AI config to use) |

**Response (200):** Translation results keyed by language code.

```bash
curl -X POST http://localhost:3001/api/ai/translate \
  -H "Authorization: Bearer eyJhbG..." \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Save changes",
    "from": "en",
    "to": ["zh-CN", "ja"],
    "projectId": "uuid"
  }'
```

---

### POST /api/ai/generate/key

Generate a suggested token key using AI based on a description.

- **Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `remark` | `string` | Yes | Description of the text purpose |
| `tag` | `string` | No | Contextual tag |
| `module` | `string` | No | Module context |
| `projectId` | `string` | Yes | Project ID |

**Response (200):**
```json
{
  "success": true,
  "data": "common.saveChanges"
}
```

---

## AI Configuration

Base path: `/api/ai/config`

Manage AI provider settings at the team or project level. Supported providers: `openai`, `claude`, `deepl`, `google-translate`.

### GET /api/ai/config/status?projectId=

Check whether AI is configured for a project (checks project-level, then falls back to team-level).

- **Auth:** Required

| Query Param | Type | Required | Description |
|-------------|------|----------|-------------|
| `projectId` | `string` | Yes | Project ID |

---

### GET /api/ai/config/team/:teamId

Get team-level AI configuration (API key is masked).

- **Auth:** Required

**Response (200):**
```json
{
  "configured": true,
  "provider": "openai",
  "model": "gpt-4o",
  "baseUrl": "https://api.openai.com/v1",
  "keyHint": "sk-...abc"
}
```

---

### PUT /api/ai/config/team/:teamId

Set or update team-level AI configuration.

- **Auth:** Required

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `provider` | `string` | Yes | Provider: `"openai"`, `"claude"`, `"deepl"`, or `"google-translate"` |
| `apiKey` | `string` | Yes | Provider API key |
| `model` | `string` | No | Model name (e.g., `"gpt-4o"`, `"claude-sonnet-4-20250514"`) |
| `baseUrl` | `string` | No | Custom base URL for self-hosted/proxy setups |

```bash
curl -X PUT http://localhost:3001/api/ai/config/team/TEAM_ID \
  -H "Authorization: Bearer eyJhbG..." \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "apiKey": "sk-...",
    "model": "gpt-4o"
  }'
```

---

### DELETE /api/ai/config/team/:teamId

Remove team-level AI configuration.

- **Auth:** Required

---

### GET /api/ai/config/project/:projectId

Get project-level AI configuration (overrides team config).

- **Auth:** Required

---

### PUT /api/ai/config/project/:projectId

Set or update project-level AI configuration.

- **Auth:** Required

Same body format as the team-level endpoint.

---

### DELETE /api/ai/config/project/:projectId

Remove project-level AI configuration (falls back to team config).

- **Auth:** Required

---

## Activity Logs

Base path: `/api/activity-logs`

All activity log endpoints require authentication.

### GET /api/activity-logs

Query activity logs with filtering and pagination.

- **Auth:** Required

| Query Param | Type | Required | Description |
|-------------|------|----------|-------------|
| `projectId` | `string` | No | Filter by project |
| `userId` | `string` | No | Filter by user |
| `type` | `string` | No | Activity type (e.g., `"PROJECT_CREATE"`, `"TOKEN_CREATE"`, `"TOKEN_UPDATE"`, `"TOKEN_DELETE"`) |
| `startDate` | `string` | No | ISO 8601 start date |
| `endDate` | `string` | No | ISO 8601 end date |
| `page` | `number` | No | Page number (default: 1) |
| `limit` | `number` | No | Items per page (default: 10) |

**Response (200):** Paginated list of activity log entries.

```bash
curl "http://localhost:3001/api/activity-logs?projectId=uuid&page=1&limit=20" \
  -H "Authorization: Bearer eyJhbG..."
```

---

### GET /api/activity-logs/project/:projectId/recent

Get recent activity for a project.

- **Auth:** Required (project member)

| Query Param | Type | Required | Description |
|-------------|------|----------|-------------|
| `limit` | `number` | No | Number of entries (default: 10) |

---

### GET /api/activity-logs/project/:projectId/timeline

Get activity timeline grouped by day.

- **Auth:** Required (project member)

| Query Param | Type | Required | Description |
|-------------|------|----------|-------------|
| `days` | `number` | No | Number of days to look back (default: 30) |

---

### GET /api/activity-logs/user/:userId/stats

Get activity statistics for a user.

- **Auth:** Required (self only)

| Query Param | Type | Required | Description |
|-------------|------|----------|-------------|
| `projectId` | `string` | No | Scope stats to a specific project |

---

### GET /api/activity-logs/:id

Get details of a specific activity log entry.

- **Auth:** Required (project member)

---

## MCP Server

The platform includes a built-in [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that enables AI coding assistants to interact with translation data.

### Connection

**URL:** `http://localhost:3001/api/mcp`

**Transport:** Streamable HTTP (MCP SDK v1.25+)

**Authentication:** API key required in the `Authorization` header.

### Client Configuration

**Claude Desktop / Cursor / VS Code:**

```json
{
  "mcpServers": {
    "transweave": {
      "url": "http://localhost:3001/api/mcp",
      "headers": {
        "Authorization": "Bearer tw_your_api_key_here"
      }
    }
  }
}
```

### MCP Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/mcp` | MCP message handling (JSON-RPC 2.0) |
| `GET` | `/api/mcp` | Establish SSE notification connection |
| `DELETE` | `/api/mcp` | Terminate MCP session |
| `GET` | `/api/mcp/info` | Service info page (HTML) |

### Available Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `list_projects` | List all i18n projects | None |
| `list_project_tokens` | List tokens for a project | `projectId` (required) |
| `get_token_details` | Get full token details with history | `tokenId` (required) |
| `create_token` | Create a new translation token | `projectId` (required), `key` (required), `translations` (required), `module`, `tags`, `comment`, `screenshots` |

#### Tool Details

**list_projects** -- No parameters. Returns an array of projects with `id`, `name`, `description`, `languages`, and `url`.

**list_project_tokens** -- Requires `projectId`. Returns all tokens with `id`, `key`, `module`, `translations`, `tags`, `comment`, and `screenshots`.

**get_token_details** -- Requires `tokenId`. Returns the complete token including `history`, `createdAt`, and `updatedAt`.

**create_token** -- Creates a new token. Required: `projectId`, `key`, `translations` (object like `{"en": "Hello", "zh-CN": "..."}`). Optional: `module` (string), `tags` (string array), `comment` (string), `screenshots` (string array of URLs).

---

## CLI Quick Reference

> **Note:** The CLI tool is planned for a future release. This section documents the intended interface.

### Installation

```bash
npm install -g transweave
```

### Commands

| Command | Description | Example |
|---------|-------------|---------|
| `transweave login` | Authenticate with the server | `transweave login --server http://localhost:3001` |
| `transweave init` | Initialize a project config in the current directory | `transweave init --project my-app` |
| `transweave pull` | Download translation files from the server | `transweave pull --format json --output ./locales` |
| `transweave push` | Upload local translation files to the server | `transweave push --format json --input ./locales` |

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TRANSWEAVE_API_KEY` | API key for authentication (alternative to `login`) | - |
| `TRANSWEAVE_SERVER` | Server base URL | `http://localhost:3001` |
