# Stage 1: Base with pnpm
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.8.0 --activate
WORKDIR /app

# Stage 2: Install dependencies (cached layer)
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/server/package.json ./packages/server/
RUN pnpm install --frozen-lockfile

# Stage 3: Build
FROM deps AS builder
COPY packages/server ./packages/server
RUN pnpm --filter @transweave/server build

# Stage 4: Production runner
FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@10.8.0 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/server/package.json ./packages/server/
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/packages/server/dist ./packages/server/dist

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "packages/server/dist/main.js"]
