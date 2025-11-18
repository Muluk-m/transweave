# QLJ I18N Manager

## 项目简介

QLJ I18N Manager 是一个用于管理多语言资源的平台，帮助开发团队高效地管理多语言项目并实现无缝协作。

## 项目结构

```bash
.
├── packages/
│   ├── server/
│   └── web/
├── README.md
└── package.json
```


## 安装依赖

```bash
pnpm install
```

## 运行项目

```bash
cd packages/server
pnpm run start:dev
```

```bash
cd packages/web
pnpm run dev
```

```bash
docker compose up -d
```



## RoadMap

[x] 上下文截图 - 为每个词条添加上下文截图，帮助理解使用场景
  - 支持点击上传和拖拽上传
  - 支持直接粘贴截图（Ctrl/Cmd + V）
  - 图片自动上传至 CDN，全球加速访问
  - 表格中快速预览截图缩略图
  - 点击查看大图，支持左右切换多张截图
[x] 模块管理 - 为项目添加功能模块管理，规范翻译 key 的命名空间
  - 模块包含中文名称和英文代码（如：智能绿盾 / smartShield）
  - 独立的模块管理 Tab，可视化管理所有模块
  - 模块列表显示名称、代码、词条数量和示例
  - 创建词条时可选择所属模块
  - AI 生成 key 时自动带上模块代码前缀（如 smartShield.link）
  - 词条列表支持按模块筛选（显示中文名称）
  - 词条表格显示模块名称和代码
  - 项目概览中展示模块统计和分布情况
  - 防止删除包含词条的模块，确保数据完整性
  - 自动处理旧数据迁移
[ ] 操作记录优化 - 优化操作记录的查询和展示
