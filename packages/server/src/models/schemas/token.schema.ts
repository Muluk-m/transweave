import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { baseSchemaOptions, addVirtualId } from '../base.schema';
import { Project } from './project.schema';

export type TokenDocument = Token & Document;

@Schema(baseSchemaOptions)
export class Token {
  @Prop({ type: MongooseSchema.Types.ObjectId, auto: true })
  _id: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  key: string;

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  translations: Record<string, any>;

  @Prop([String])
  tags: string[];

  @Prop()
  comment: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Project', required: true })
  projectId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Project' })
  project: Project;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  // 虚拟字段
  id: string;
}

export const TokenSchema = SchemaFactory.createForClass(Token);

// 添加虚拟字段
addVirtualId(TokenSchema);
