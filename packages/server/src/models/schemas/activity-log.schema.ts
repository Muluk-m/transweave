import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { baseSchemaOptions, addVirtualId } from '../base.schema';
import { User } from './user.schema';
import { Project } from './project.schema';

export type ActivityLogDocument = ActivityLog & Document;

// 操作类型枚举
export enum ActivityType {
  // 项目相关操作
  PROJECT_CREATE = 'PROJECT_CREATE',
  PROJECT_UPDATE = 'PROJECT_UPDATE',
  PROJECT_DELETE = 'PROJECT_DELETE',
  PROJECT_LANGUAGE_ADD = 'PROJECT_LANGUAGE_ADD',
  PROJECT_LANGUAGE_REMOVE = 'PROJECT_LANGUAGE_REMOVE',
  
  // 令牌相关操作
  TOKEN_CREATE = 'TOKEN_CREATE',
  TOKEN_UPDATE = 'TOKEN_UPDATE',
  TOKEN_DELETE = 'TOKEN_DELETE',
  TOKEN_BATCH_UPDATE = 'TOKEN_BATCH_UPDATE',
  
  // 导入导出操作
  PROJECT_EXPORT = 'PROJECT_EXPORT',
  PROJECT_IMPORT = 'PROJECT_IMPORT',
}

// 操作详情接口
export interface ActivityDetails {
  // 通用字段
  entityId?: string; // 被操作实体的ID
  entityType?: 'project' | 'token'; // 实体类型
  entityName?: string; // 实体名称（如项目名、令牌key）
  
  // 变更相关
  changes?: {
    field: string; // 变更字段
    oldValue?: any; // 旧值
    newValue?: any; // 新值
  }[];
  
  // 导入导出相关
  language?: string; // 相关语言
  format?: string; // 文件格式
  mode?: string; // 导入模式
  stats?: {
    added?: number;
    updated?: number;
    unchanged?: number;
    total?: number;
  };
  
  // 其他元数据
  metadata?: Record<string, any>;
}

@Schema(baseSchemaOptions)
export class ActivityLog {
  @Prop({ type: MongooseSchema.Types.ObjectId, auto: true })
  _id: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, enum: ActivityType })
  type: ActivityType;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Project', required: true })
  projectId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Project' })
  project: Project;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.Mixed })
  details: ActivityDetails;

  @Prop()
  ipAddress: string;

  @Prop()
  userAgent: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  // 虚拟字段
  id: string;
}

export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);

// 添加虚拟字段
addVirtualId(ActivityLogSchema);

// 添加索引
ActivityLogSchema.index({ projectId: 1, createdAt: -1 });
ActivityLogSchema.index({ userId: 1, createdAt: -1 });
ActivityLogSchema.index({ type: 1, createdAt: -1 }); 