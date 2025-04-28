import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { baseSchemaOptions, addVirtualId } from '../base.schema';
import { Membership } from './membership.schema';
import { Project } from './project.schema';

export type TeamDocument = Team & Document;

@Schema(baseSchemaOptions)
export class Team {
  @Prop({ type: MongooseSchema.Types.ObjectId, auto: true })
  _id: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  url: string;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Membership' }] })
  memberships: Membership[];

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Project' }] })
  projects: Project[];

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  // 虚拟字段
  id: string;
}

export const TeamSchema = SchemaFactory.createForClass(Team);

// 添加虚拟字段
addVirtualId(TeamSchema);
