## ADDED Requirements

### Requirement: Project 页面使用 4 个精简 Tab
系统 SHALL 将项目详情页的 Tab 从 7 个精简为 4 个：概览、翻译、文件、设置。

#### Scenario: 访问项目页
- **WHEN** 用户导航到 `/project/[projectId]`
- **THEN** 页面顶部显示且仅显示 4 个 Tab：概览 / 翻译 / 文件 / 设置

### Requirement: 概览 Tab 内嵌活动时间线
系统 SHALL 在概览 Tab 中展示项目统计数据，并在下方展示最近活动记录（最多 20 条）。

#### Scenario: 查看概览
- **WHEN** 用户点击"概览" Tab
- **THEN** 页面上方显示项目统计卡片，下方显示活动时间线，单次最多展示 20 条

### Requirement: 翻译 Tab 内嵌模块分组选择
系统 SHALL 在翻译 Tab 中提供模块（Module）分组过滤器，允许用户按模块筛选 Token 列表。

#### Scenario: 按模块过滤翻译
- **WHEN** 用户在翻译 Tab 顶部选择某个模块
- **THEN** Token 列表仅展示属于该模块的 Token

#### Scenario: 查看全部翻译
- **WHEN** 用户选择"全部"选项
- **THEN** Token 列表展示所有模块的 Token

### Requirement: 文件 Tab 合并导入和导出
系统 SHALL 将原有的独立"导入" Tab 和"导出" Tab 合并为单个"文件" Tab，内部用分区或子选项卡区分两个操作。

#### Scenario: 切换到导入操作
- **WHEN** 用户在文件 Tab 中选择"导入"
- **THEN** 显示文件上传区域和导入配置选项

#### Scenario: 切换到导出操作
- **WHEN** 用户在文件 Tab 中选择"导出"
- **THEN** 显示导出格式选择和下载选项

### Requirement: 所有 Tab 标签使用 i18n key
系统 SHALL 使用 i18n 翻译 key 渲染所有 Tab 标签，不得硬编码中文字符串。

#### Scenario: 中文环境下查看 Tab
- **WHEN** 用户语言设置为中文
- **THEN** Tab 标签显示中文（概览 / 翻译 / 文件 / 设置）

#### Scenario: 英文环境下查看 Tab
- **WHEN** 用户语言设置为英文
- **THEN** Tab 标签显示英文（Overview / Translations / Files / Settings）
