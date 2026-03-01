# Technology Stack

**Analysis Date:** 2026-03-01

## Languages

**Primary:**
- TypeScript 5.x - Used across all packages (web frontend and server backend)
- JavaScript - Configuration files and build scripts

**Secondary:**
- HTML/CSS - Web components (via React/Next.js)

## Runtime

**Environment:**
- Node.js 18.18.0+ (specified in root package.json)
- Next.js 15.2.6 (Web frontend runtime)
- NestJS 11.x (Backend server framework)

**Package Manager:**
- pnpm 10.8.0 (workspace manager)
- Lockfile: `pnpm-lock.yaml` (present)

## Frameworks

**Core:**
- Next.js 15.2.6 - Web frontend framework with React 19.0.1
- NestJS 11.0.1 - Backend API framework with Express

**UI & Components:**
- React 19.0.1 - Frontend UI library
- Radix UI (multiple packages @radix-ui/*) - Unstyled, accessible component primitives
- Tailwind CSS 3.4.1 - Utility-first CSS framework
- Motion 12.18.1 - Animation library

**State Management & Forms:**
- Jotai 2.9.3 - Primitive and flexible state management
- React Hook Form 7.54.2 - Performant form handling
- TanStack React Table 8.21.3 - Headless table component

**Internationalization:**
- next-intl 3.26.5 - Multilingual routing and message management for Next.js

**Testing:**
- Jest 29.7.0 - Test runner (backend)
- ts-jest 29.2.5 - TypeScript support for Jest
- Supertest 7.0.0 - HTTP assertion library
- @nestjs/testing 11.0.1 - NestJS testing utilities

**Build/Dev Tools:**
- SWC (@swc/cli 0.6.0, @swc/core 1.10.7) - Fast JavaScript/TypeScript compiler
- ts-loader 9.5.2 - Webpack TypeScript loader
- ts-node 10.9.2 - TypeScript execution for Node.js
- Prettier 3.4.2 - Code formatter
- ESLint 9.18.0 - JavaScript linter

## Key Dependencies

**Critical:**
- @nestjs/common 11.0.1 - NestJS core decorators and utilities
- @nestjs/core 11.0.1 - NestJS core bootstrap
- @nestjs/passport 11.0.5 - Passport.js integration for NestJS
- @nestjs/jwt 11.0.0 - JWT authentication for NestJS
- @nestjs/axios 4.0.0 - Axios HTTP client for NestJS
- @nestjs/mongoose 11.0.3 - MongoDB integration for NestJS
- @prisma/client 6.4.1 - Prisma ORM (included but MongoDB primary)
- mongoose 8.14.0 - MongoDB object modeling

**Infrastructure:**
- axios 1.8.1 - HTTP client (both frontend and backend)
- passport 0.7.0 - Authentication middleware
- passport-jwt 4.0.1 - JWT strategy for Passport
- reflect-metadata 0.2.2 - Required for NestJS decorators
- rxjs 7.8.1 - Reactive programming library

**Data Validation & Parsing:**
- zod 3.25.76 - TypeScript-first schema validation
- @hookform/resolvers 4.1.2 - Validation resolvers for React Hook Form

**Utilities:**
- date-fns 4.1.0 - Date manipulation library
- uuid 11.1.0 - UUID generation
- jszip 3.10.1 - ZIP file handling
- adm-zip 0.5.16 - Alternative ZIP library
- dotenv 16.5.0 - Environment variable management
- clsx 2.1.1 - Utility for conditional className
- tailwind-merge 2.5.2 - Merge Tailwind classes intelligently
- lucide-react 0.428.0 - Icon library
- nuqs 2.4.3 - Next.js URL query string state management
- rc-virtual-list 3.18.1 - Virtual scrolling list
- react-day-picker 9.7.0 - Date picker component
- react-dropzone 14.3.8 - File upload component
- vaul 0.9.9 - Dialog primitive
- enum-plus 2.2.11 - Enhanced enum functionality
- cmdk 1.1.1 - Command menu component

**Model Context Protocol:**
- @modelcontextprotocol/sdk 1.25.2 - MCP server SDK for Claude integration

## Configuration

**Environment:**
- Environment variables stored in `.env` files (present in server package)
- `NEXT_PUBLIC_API_URL` - Frontend API base URL configuration
- `JWT_SECRET` - JWT signing secret (default fallback in code)
- `DATABASE_URL` - MongoDB connection URL
- `FEISHU_CLIENT_ID`, `FEISHU_CLIENT_SECRET` - Feishu OAuth credentials
- `DIFY_API_KEY` - AI service API key
- `PORT` - Server listening port (defaults to 3001)

**Build:**
- `tsconfig.json` - TypeScript configuration
- `next.config.mjs` - Next.js configuration (minimal)
- `postcss.config.mjs` - PostCSS configuration for Tailwind
- `tailwind.config.ts` - Tailwind CSS configuration
- `eslint.config.mjs` - ESLint configuration (server)
- `.prettierrc` - Prettier configuration

## Platform Requirements

**Development:**
- Node.js >= 18.18.0
- pnpm >= 10.8.0
- MongoDB (for local development, via Docker Compose)

**Production:**
- Node.js >= 18.18.0
- MongoDB instance (remote)
- Deployment target: Node.js server runtime (can be Docker, Vercel, or traditional servers)

---

*Stack analysis: 2026-03-01*
