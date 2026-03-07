## Why

模块页面设计存在几个问题：
1. 添加表单视觉权重过大，占据页面近半空间，喧宾夺主
2. "添加"和"列表"拆成两个 Card，割裂感强
3. `name`（中文）+ `code`（英文）的字段设计不符合多语言平台特性——一个 i18n 工具的模块名反而只支持中文
4. 页面标题与 Tab 标签重复
5. 空状态下整个页面又大又空，缺乏引导

## What Changes

### 数据模型
- `ProjectModule.name`（必填）→ `ProjectModule.description`（可选）
- `code` 保持不变，作为模块主标识符

### 前端布局
- 两个 Card 合并为一个
- 添加按钮移到标题栏右侧，点击展开内联表单
- 表单简化为一行：code 输入 + description 输入（可选）+ 添加按钮
- 空状态时表单默认展开，引导用户添加第一个模块
- 列表列调整为：模块代码 / 描述 / 词条数 / 操作

### 后端
- Module 字段从 `name` 改为 `description?`
- 相关 API（addModule、removeModule）适配新字段
- 数据库迁移：现有 `name` 值迁移到 `description`

## Capabilities

### Modified Capabilities
- `modules`: 模块数据模型和管理界面重构

## Impact

- **前端**: `ProjectModulesTab.tsx` — 重写布局和表单
- **后端 Schema**: `projects.modules` JSON 字段内 `name` → `description?`
- **后端 DTO**: `AddModuleDto` 更新字段
- **后端 Service**: `ProjectService` 中模块相关方法适配
- **数据迁移**: 现有模块 `name` 值迁移到 `description`
- **i18n**: 更新 `modules` 命名空间的翻译 key
