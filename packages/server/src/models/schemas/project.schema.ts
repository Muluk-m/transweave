import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { baseSchemaOptions, addVirtualId } from '../base.schema';
import { Token } from './token.schema';
import { Team } from './team.schema';

export type ProjectDocument = Project & Document;

// Module Schema for nested module objects
@Schema({ _id: false, timestamps: false })
export class ProjectModule {
  @Prop({ required: true })
  name: string; // 模块名称（中文）

  @Prop({ required: true })
  code: string; // 模块代码（英文，用作 key 前缀）
}

export const ProjectModuleSchema = SchemaFactory.createForClass(ProjectModule);

@Schema(baseSchemaOptions)
export class Project {
  @Prop({ type: MongooseSchema.Types.ObjectId, auto: true })
  _id: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  url: string;

  @Prop()
  defaultLang: string;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Token' }] })
  tokens: Token[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Team', required: true })
  teamId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Team' })
  team: Team;

  @Prop()
  description: string;

  @Prop([String])
  languages: string[];

  @Prop({ type: Map, of: String, default: {} })
  languageLabels: Map<string, string>; // 自定义语言的中文备注，key 为语言代码，value 为中文名称

  @Prop({ type: [ProjectModuleSchema], default: [] })
  modules: ProjectModule[]; // Module/namespace prefixes for organizing translation keys

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  // 虚拟字段
  id: string;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);

// 添加虚拟字段
addVirtualId(ProjectSchema);
