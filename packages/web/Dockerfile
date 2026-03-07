# Stage 1: Base with pnpm
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.8.0 --activate
WORKDIR /app

# Stage 2: Install dependencies (cached layer)
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/web/package.json ./packages/web/
RUN pnpm install --frozen-lockfile

# Stage 3: Build
FROM deps AS builder
COPY packages/web ./packages/web
RUN pnpm --filter @transweave/web build

# Stage 4: Production runner (standalone mode — no pnpm needed)
FROM node:22-alpine AS runner
WORKDIR /app

# standalone output bundles everything needed to run
COPY --from=builder /app/packages/web/.next/standalone ./
# static assets are not included in standalone, copy separately
COPY --from=builder /app/packages/web/.next/static ./packages/web/.next/static
COPY --from=builder /app/packages/web/public ./packages/web/public

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

CMD ["node", "packages/web/server.js"]
