import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { baseSchemaOptions, addVirtualId } from '../base.schema';
import { Token } from './token.schema';
import { Team } from './team.schema';

export type ProjectDocument = Project & Document;

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
