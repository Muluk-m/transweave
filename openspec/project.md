# Project Context

## Purpose
Transweave 是一个多语言资源管理平台,帮助开发团队高效地管理多语言项目并实现无缝协作。提供词条管理、模块管理、上下文截图、操作记录等功能。

## Tech Stack

### Monorepo 结构
- **包管理器**: pnpm@10.8.0 (workspace)
- **Node 版本要求**: >=18.18.0

### Backend (packages/server)
- **框架**: NestJS 11.x
- **数据库**: PostgreSQL（生产）/ PGlite（本地开发，`DATABASE_URL` 未设置时自动启用）
- **ORM**: Drizzle ORM + drizzle-kit
- **认证**: JWT + Passport
- **运行时**: Node.js + TypeScript 5.x
- **HTTP 客户端**: Axios
- **其他**: dotenv, jszip, uuid, @modelcontextprotocol/sdk

### Frontend (packages/web)
- **框架**: Next.js 15.2 + React 19
- **UI 组件**: Radix UI + shadcn/ui
- **样式**: Tailwind CSS + class-variance-authority
- **状态管理**: Jotai
- **表单**: React Hook Form + Zod
- **国际化**: next-intl
- **表格**: @tanstack/react-table
- **动画**: motion
- **其他**: cmdk, rc-virtual-list, date-fns

### 基础设施
- **容器化**: Docker + Docker Compose
- **数据库部署**: PostgreSQL（容器或外部托管）；本地开发可零配置使用 PGlite 嵌入式数据库

## Project Conventions

### Code Style
- **语言**: TypeScript (严格模式)
- **格式化**: Prettier
- **Lint**: ESLint (Next.js + NestJS 配置)
- **命名约定**:
  - 文件名: kebab-case (如 `project.service.ts`)
  - 组件: PascalCase (如 `ProjectView.tsx`)
  - 变量/函数: camelCase
  - 常量: UPPER_SNAKE_CASE
  - 类型/接口: PascalCase

### Architecture Patterns
- **Monorepo**: pnpm workspace 管理多包
- **Backend**: NestJS 模块化架构
  - Controller → Service → Repository 分层（Drizzle 作为 ORM，schema 定义在 `db/schema/`）
  - JWT 认证守卫
  - 请求 ID 中间件
  - 日志拦截器
  - 全局异常过滤器统一错误响应
- **Frontend**: Next.js App Router
  - Server Components + Client Components
  - API 路由统一管理在 `api/` 目录
  - 组件按视图组织 (`components/views/`)
  - 共享组件在 `components/` 根目录
  - 使用 Jotai 管理全局状态
  - 表单使用 react-hook-form + zod 验证

### Testing Strategy
- **Backend**: Jest + Supertest (E2E)
- **Frontend**: 待完善
- 测试文件命名: `*.spec.ts` 或 `*.e2e-spec.ts`

### Git Workflow
- **分支策略**: 主分支 + 功能分支
- **Commit 规范**: 
  - 英文 commit message
  - 最大长度不超过 120 字符
  - 格式: `<type>: <description>`
  - 类型: feat, fix, docs, style, refactor, test, chore

## Domain Context

### 核心概念
- **Team (团队)**: 组织单位,包含多个项目和成员
- **Project (项目)**: 多语言项目,包含词条和模块
- **Token (词条)**: 单个翻译单元,包含 key 和多语言 value
- **Module (模块)**: 功能模块,用于组织词条命名空间
- **Context Screenshot (上下文截图)**: 帮助理解词条使用场景的截图
- **Activity Log (操作记录)**: 审计日志,记录所有操作

### 业务规则
- 模块包含中文名称和英文代码
- 词条 key 自动带模块代码前缀 (如 `smartShield.link`)
- 不能删除包含词条的模块
- 支持批量导入/导出翻译

### 用户角色
- 普通成员: 可编辑词条
- 团队管理员: 可管理项目和成员

## Important Constraints

### 技术限制
- 生产环境需 PostgreSQL 14+；本地开发 PGlite 嵌入式数据库零配置
- Node.js 版本必须 >= 18.18.0
- 使用 pnpm 而非 npm/yarn

### 业务约束
- 模块代码必须唯一
- 词条 key 在项目内必须唯一
- 删除操作需考虑关联数据

### 安全要求
- API 端点需 JWT 认证
- 数据库连接通过 `DATABASE_URL` 配置（含密码），生产环境强制使用 TLS
- 敏感配置通过环境变量管理
- 限流：100 req/60s（NestJS Throttler）

## External Dependencies

### 第三方服务
- **CDN**: 用于上传和存储上下文截图 (具体服务待确认)
- **AI 服务**: 用于生成翻译 key (具体 API 待确认)

### 开发依赖
- **PostgreSQL** 或 **PGlite**：生产用 PostgreSQL，本地开发 `DATABASE_URL` 未设置时自动使用 PGlite
- **Docker**: 用于本地开发环境

### API 集成
- 词条导入/导出功能
- AI key 生成接口
