## 1. 后端 Schema & DTO

- [x] 1.1 projects schema 新增 `enableVersioning` boolean 字段（默认 true）
- [x] 1.2 UpdateProjectDto 新增 `enableVersioning` 可选字段（@IsOptional @IsBoolean）

## 2. 后端版本控制逻辑

- [x] 2.1 TokenService.create 中判断项目 enableVersioning，关闭时跳过 history 记录
- [x] 2.2 TokenService.update 中判断项目 enableVersioning，关闭时跳过 history 记录

## 3. 后端版本回滚 API

- [x] 3.1 TokenService 新增 restore 方法：验证 tokenId/historyId 归属，全量覆盖 translations，按 enableVersioning 决定是否记录 history，记录 activity log
- [x] 3.2 TokenController 新增 `POST /api/token/:tokenId/restore/:historyId` 端点

## 4. 前端高级设置 UI 改造

- [x] 4.1 移除"启用评论"和"公开项目"开关及相关 state
- [x] 4.2 "自动翻译"开关设为 disabled，添加 "Coming Soon" Badge
- [x] 4.3 "版本控制"开关从 project.enableVersioning 初始化，保存时发送到后端
- [x] 4.4 清理不再使用的 i18n key（如有）

## 5. 前端版本回滚 UI

- [x] 5.1 TokenFormDrawer 历史记录列表添加"恢复此版本"按钮
- [x] 5.2 点击恢复按钮弹出确认对话框，确认后调用 restore API
- [x] 5.3 恢复成功后刷新 token 数据

## 6. 测试

- [x] 6.1 E2E 测试：版本控制开关持久化（更新项目 enableVersioning）
- [x] 6.2 E2E 测试：关闭版本控制后 token 更新不产生 history
- [x] 6.3 E2E 测试：版本回滚 API 正常流程和异常流程
