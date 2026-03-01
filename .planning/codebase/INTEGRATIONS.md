# External Integrations

**Analysis Date:** 2026-03-01

## APIs & External Services

**AI/Translation:**
- Dify - AI-powered translation and token key generation service
  - SDK/Client: `@nestjs/axios` (HTTP client)
  - Endpoint: `https://api-ai.qiliangjia.org/v1/chat-messages`
  - Auth: Bearer token via `DIFY_API_KEY` environment variable
  - Implementation: `packages/server/src/service/ai.service.ts`
  - Usage:
    - `translate()` - Translate text to multiple languages
    - `generateTokenKey()` - Generate i18n token keys with AI

**Authentication Provider:**
- Feishu (DingTalk-like platform) - OAuth-based authentication
  - SDK/Client: HTTP API via `@nestjs/axios`
  - OAuth Endpoints:
    - Token: `https://open.feishu.cn/open-apis/authen/v2/oauth/token`
    - User Info: `https://open.feishu.cn/open-apis/authen/v1/user_info`
  - Auth Credentials: `FEISHU_CLIENT_ID`, `FEISHU_CLIENT_SECRET`
  - Implementation: `packages/server/src/service/auth.service.ts`
  - Flow: Authorization code grant with access token retrieval

**File Upload/CDN:**
- QiLiangJia CDN (internal) - File storage and image upload
  - Endpoint: `https://qlj-devhub-homepage.qiliangjia.one/api/uploads`
  - Auth: Bearer token via `localStorage.getItem('authToken')`
  - Implementation: `packages/web/api/upload.ts`
  - Usage:
    - `uploadImage()` - Single image upload
    - `uploadFiles()` - Batch file upload
    - Stores screenshots and context images for translation tokens
  - Response format: Returns files array with `urls` object containing `r2` (Cloudflare R2) and other CDN URLs

## Data Storage

**Databases:**
- MongoDB
  - Connection: Via `DATABASE_URL` environment variable
  - Default: `mongodb://admin:secret@localhost:27017/bondma?authSource=admin&replicaSet=rs0`
  - Client: Mongoose 8.14.0 with NestJS @nestjs/mongoose 11.0.3
  - Configuration: `packages/server/src/modules/database.module.ts`
  - Authentication: SCRAM-SHA-1 mechanism
  - Collections:
    - `User` - User accounts and profiles
    - `Team` - Team/organization management
    - `Membership` - Team membership relationships
    - `Project` - I18n projects
    - `Token` - Translation tokens/strings
    - `TokenHistory` - Token change history
    - `ActivityLog` - User activity audit logs

**File Storage:**
- Cloudflare R2 (via QiLiangJia CDN) - Object storage for screenshots
  - Integration point: `uploadImage()` and `uploadFiles()` in `packages/web/api/upload.ts`
  - URL format: Retrieved from upload response `urls.r2` field

**Caching:**
- None detected - no Redis or memcached integrations found

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based authentication with local account support
  - Implementation: `packages/server/src/service/auth.service.ts`
  - Token signing: `@nestjs/jwt 11.0.0`
  - Expiration: 15 days
  - Secret: `JWT_SECRET` environment variable (fallback: 'your-secret-key')

**Feishu OAuth:**
- Full OAuth 2.0 integration for Feishu login
- Authorization code flow with credential exchange
- Automatic user creation on first login
- Fields extracted: `open_id`, `union_id`, `name`, `enterprise_email`, `avatar_url`
- Implementation: `packages/server/src/service/auth.service.ts` - `loginWithFeishu()` method

**Password Security:**
- Bcrypt-based hashing via `packages/server/src/utils/crypto.ts`
- Functions: `hashPassword()`, `verifyPassword()`

## Monitoring & Observability

**Error Tracking:**
- None detected - no Sentry, LogRocket, or similar integration

**Logs:**
- NestJS built-in logging with custom interceptor
  - Logger levels: 'log', 'error', 'warn', 'debug', 'verbose'
  - Global interceptor: `packages/server/src/interceptors/logging.interceptor.ts`
  - Request tracking via `packages/server/src/middleware/request-id.middleware.ts`
- Frontend console logging via `lib/api.ts`
  - Groups logs by HTTP request for debugging
  - Logs request headers, body, response status, and data

## CI/CD & Deployment

**Hosting:**
- Not explicitly configured in code - appears to be manually deployed

**CI Pipeline:**
- GitHub (repository platform)
- Scripts for manual deployment:
  - Web: `pnpm --filter ./packages/web build`
  - Server: `NODE_OPTIONS='--max-old-space-size=4096' nest build`

## Environment Configuration

**Required env vars (Server):**
- `DATABASE_URL` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `FEISHU_CLIENT_ID` - Feishu OAuth client ID
- `FEISHU_CLIENT_SECRET` - Feishu OAuth client secret
- `DIFY_API_KEY` - Dify AI service API key
- `PORT` - Server listening port (optional, defaults to 3001)

**Required env vars (Web):**
- `NEXT_PUBLIC_API_URL` - Backend API base URL (optional, defaults to http://localhost:3001)
- Browser localStorage: `authToken` - JWT token stored after login

**Secrets location:**
- Server: `.env` file in `packages/server/` (not committed to git)
- Web: Runtime via `process.env.NEXT_PUBLIC_*` variables

## Webhooks & Callbacks

**Incoming:**
- Feishu OAuth redirect: Handled at `packages/web/app/login/page.tsx`
  - Redirects to Feishu authorization endpoint
  - Callback path: `[ORIGIN]/login?code=[auth_code]&state=[state]`

**Outgoing:**
- None detected

## Model Context Protocol (MCP)

**MCP Server Integration:**
- SDK: `@modelcontextprotocol/sdk 1.25.2`
- Implementation: `packages/server/src/service/mcp.service.ts`
- Registered Tools:
  - `list_projects` - Lists all i18n projects
  - `list_project_tokens` - Queries project token list
  - `get_token_details` - Gets detailed token information
  - `create_token` - Creates new translation token
- Purpose: Enables Claude AI to interact with the i18n system via the Model Context Protocol
- Configuration: `packages/server/src/app.module.ts` - McpService provider

---

*Integration audit: 2026-03-01*
