## Why

项目高级设置中有四个功能开关，但大多数只是 UI 占位符——开关状态不持久化、后端无对应逻辑。需要清理无价值功能，并补全版本控制的完整实现。

## What Changes

- **移除**"启用评论"和"公开项目"两个开关（无实际价值，评论未来用审校流程替代）
- **禁用**"自动翻译"开关，添加 "Coming Soon" 标签
- **补全版本控制**：项目级开关持久化到数据库，开关控制是否记录 token 修改历史，新增回滚 API 和前端恢复按钮
- **BREAKING**: 移除前端两个设置项（评论、公开项目），不影响 API

## Capabilities

### New Capabilities
- `version-control`: Token 修改历史的项目级开关控制和版本回滚功能

### Modified Capabilities

## Impact

- **前端**: `ProjectSettingTab.tsx` — 移除两个开关，禁用一个，版本控制开关绑定后端
- **后端 Schema**: `projects` 表新增 `enableVersioning` 字段
- **后端 API**: 新增 `POST /api/token/history/:historyId/restore` 回滚端点
- **后端 Service**: `TokenService` 创建/更新时检查项目版本控制开关
- **DTO**: `UpdateProjectDto` 新增 `enableVersioning` 字段
