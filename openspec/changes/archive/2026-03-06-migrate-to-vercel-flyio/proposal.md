# Migrate Deployment: Render → Vercel + Fly.io

## Problem

当前项目部署在 Render 免费方案，所有服务（Web、Server、PostgreSQL）在不活跃 15 分钟后进入 sleep 状态。冷启动需要 30-60 秒，导致：

- 用户打开页面白屏等待
- 登录接口超时报错，无法进入核心页面
- Demo 展示体验极差

## Solution

将部署拆分到两个平台，利用各自的免费方案优势：

```
┌─────────────────┐          ┌─────────────────┐
│   Vercel (免费)  │          │  Fly.io (免费)   │
│                  │          │                  │
│   Next.js 前端   │──API───▶ │  NestJS 后端     │
│   不 sleep       │          │  不 sleep        │
│   全球 CDN       │          │  256MB VM        │
│   Git push 部署  │          │                  │
│                  │          │  Fly Postgres    │
│                  │          │  不 sleep        │
└─────────────────┘          └─────────────────┘
```

## Why This Split

| 维度 | Vercel (前端) | Fly.io (后端+DB) |
|------|--------------|-----------------|
| 优势 | Next.js 原生支持，零配置 | 常驻 VM，不 sleep |
| 部署 | Git push 自动部署 | `fly deploy` / GitHub Actions |
| 费用 | 免费 | 免费（3台256MB VM + 1 PG） |

- Next.js 在 Vercel 上无需 Docker，部署更快
- Fly.io 免费额度给后端 + DB，256MB 跑 NestJS 绑绑有余
- 用户访问体验：前端秒出（CDN），后端常驻（无冷启动）

## Scope

### 需要改动的代码

1. **后端 CORS 配置** — 当前 `main.ts` 没有 CORS 设置，前后端同域不需要。拆到不同域后必须添加 `app.enableCors()` 并配置允许的 origin
2. **添加 `fly.toml`** — Fly.io 部署配置文件（后端）
3. **Vercel 配置** — `vercel.json` 或直接在 Vercel Dashboard 设置 `NEXT_PUBLIC_API_URL`
4. **Next.js config** — 可以移除 `output: 'standalone'`（Vercel 不需要），或保留兼容 Docker 部署

### 不需要改动的

- Dockerfile（保留给 Fly.io 后端使用 + Docker Compose 本地开发）
- 数据库 schema / Drizzle 配置
- API 接口逻辑
- 前端组件代码

## Tasks

1. **后端添加 CORS** — `main.ts` 中 `app.enableCors({ origin: process.env.CORS_ORIGIN })`
2. **创建 `fly.toml`** — 后端 Fly.io 部署配置
3. **Fly.io 初始化** — 创建 app + Postgres，设置 secrets（JWT_SECRET, CORS_ORIGIN）
4. **Vercel 部署前端** — 连接 Git repo，设置 `NEXT_PUBLIC_API_URL` 指向 Fly.io 后端
5. **（可选）GitHub Actions** — 自动化 `fly deploy`

## Risks

- **Fly.io 免费额度变动** — Fly.io 历史上调整过免费方案，需关注
- **跨域 Cookie** — 如果将来需要 Cookie-based auth，跨域会有 SameSite 限制（当前用 Bearer token，不受影响）
- **Fly Postgres 自管** — 没有自动备份，需要自己 `fly postgres backup`
