## Tasks

### 1. 后端：模块数据模型更新
- [x] 更新 `ProjectModule` 类型：`name` → `description?`
- [x] 更新 `AddModuleDto`：`name` 必填 → `description` 可选
- [x] 更新 `ProjectService` 中模块相关方法
- [x] 数据迁移：现有 `name` 值写入 `description`

### 2. 前端：类型与 API 适配
- [x] 更新 `ProjectModule` 类型定义（jotai/types.ts）
- [x] 更新 `addModule` API 调用参数

### 3. 前端：页面布局重构
- [x] 合并两个 Card 为一个
- [x] 标题栏添加 [+ 添加] 按钮控制表单展开/折叠
- [x] 内联表单：code + description（可选）+ 添加按钮，一行布局
- [x] 提示文字紧贴输入框下方
- [x] 空状态时表单默认展开
- [x] 有模块时表单默认折叠
- [x] 列表列调整：模块代码 / 描述 / 词条数 / 操作

### 4. i18n：翻译更新
- [x] 移除 `moduleName` 相关 key
- [x] 新增 `description` 相关 key
- [x] 更新 placeholder 和 hint 文案
