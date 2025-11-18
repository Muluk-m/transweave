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
[ ] 操作记录优化 - 优化操作记录的查询和展示
