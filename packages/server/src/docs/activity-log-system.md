# 项目操作日志系统

## 概述

操作日志系统用于记录项目级别的所有操作，包括项目和令牌的创建、更新、删除等操作。每个操作都会记录详细的信息，包括操作者、操作时间、操作类型和变更内容。

## 数据模型

### ActivityLog Schema

```typescript
{
  type: ActivityType;          // 操作类型
  projectId: ObjectId;         // 项目ID
  userId: ObjectId;            // 操作者ID
  details: {
    entityId: string;          // 被操作实体的ID
    entityType: string;        // 实体类型 ('project' | 'token')
    entityName: string;        // 实体名称
    changes?: Array<{          // 变更内容
      field: string;
      oldValue: any;
      newValue: any;
    }>;
    language?: string;         // 相关语言（导入/导出）
    format?: string;           // 文件格式（导入/导出）
    mode?: string;             // 模式（导入）
    stats?: {                  // 统计信息（导入）
      added: number;
      updated: number;
      unchanged: number;
      total: number;
    };
    metadata?: any;            // 其他元数据
  };
  ipAddress?: string;          // IP地址
  userAgent?: string;          // User Agent
  createdAt: Date;             // 创建时间
}
```

### 操作类型 (ActivityType)

- `PROJECT_CREATE` - 创建项目
- `PROJECT_UPDATE` - 更新项目
- `PROJECT_DELETE` - 删除项目
- `PROJECT_LANGUAGE_ADD` - 添加项目语言
- `PROJECT_LANGUAGE_REMOVE` - 移除项目语言
- `TOKEN_CREATE` - 创建令牌
- `TOKEN_UPDATE` - 更新令牌
- `TOKEN_DELETE` - 删除令牌
- `TOKEN_BATCH_UPDATE` - 批量更新令牌
- `PROJECT_EXPORT` - 导出项目
- `PROJECT_IMPORT` - 导入项目

## API 接口

### 1. 查询操作日志

```
GET /api/activity-logs?projectId=xxx&userId=xxx&type=xxx&startDate=xxx&endDate=xxx&page=1&limit=20
```

查询参数：
- `projectId` (可选) - 项目ID
- `userId` (可选) - 用户ID
- `type` (可选) - 操作类型
- `startDate` (可选) - 开始日期
- `endDate` (可选) - 结束日期
- `page` (可选) - 页码，默认1
- `limit` (可选) - 每页数量，默认20

### 2. 获取项目最近活动

```
GET /api/activity-logs/project/:projectId/recent?limit=10
```

### 3. 获取项目活动时间线

```
GET /api/activity-logs/project/:projectId/timeline?days=30
```

返回按日期分组的活动统计。

### 4. 获取用户操作统计

```
GET /api/activity-logs/user/:userId/stats?projectId=xxx
```

返回用户的操作类型统计。

### 5. 获取操作日志详情

```
GET /api/activity-logs/:id
```

## 使用示例

### 在 ProjectService 中记录操作

所有的项目和令牌操作方法都已经集成了日志记录功能。在调用这些方法时，需要传入额外的参数：

```typescript
// 创建项目
await projectService.createProject({
  name: '新项目',
  teamId: 'team-id',
  url: 'project-url',
  languages: ['zh', 'en'],
  userId: '当前用户ID',
  ipAddress: '客户端IP',
  userAgent: 'User-Agent字符串',
});

// 更新项目
await projectService.updateProject(projectId, {
  name: '更新后的名称',
  userId: '当前用户ID',
  ipAddress: '客户端IP',
  userAgent: 'User-Agent字符串',
});

// 删除项目
await projectService.deleteProject(
  projectId,
  '当前用户ID',
  '客户端IP',
  'User-Agent字符串'
);
```

### 在控制器中使用

控制器需要提取用户信息和请求信息，并传递给服务方法：

```typescript
@Post()
@UseGuards(AuthGuard)
async createProject(
  @Body() createDto: CreateProjectDto,
  @CurrentUser() user: UserPayload,
  @Req() request: Request,
) {
  return this.projectService.createProject({
    ...createDto,
    userId: user.userId,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'],
  });
}
```

## 注意事项

1. **权限控制**：查询操作日志时会验证用户是否有权限访问相应的项目。
2. **性能优化**：ActivityLog 集合已添加了必要的索引以优化查询性能。
3. **数据清理**：可以使用 `cleanOldLogs` 方法定期清理过期的日志数据。
4. **事务一致性**：日志记录在数据库事务中进行，确保数据一致性。

## 扩展建议

1. **实时通知**：可以基于操作日志实现实时通知功能。
2. **审计报告**：可以基于日志数据生成审计报告。
3. **异常检测**：可以分析日志模式来检测异常操作。
4. **数据恢复**：可以基于日志实现某些操作的撤销功能。 