import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { baseSchemaOptions, addVirtualId } from '../base.schema';
import { User } from './user.schema';
import { Team } from './team.schema';

export type MembershipDocument = Membership & Document;

@Schema(baseSchemaOptions)
export class Membership {
  @Prop({ type: MongooseSchema.Types.ObjectId, auto: true })
  _id: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  user: User;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Team', required: true })
  teamId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Team' })
  team: Team;

  @Prop({ required: true })
  role: string; // "owner", "manager", "member"

  // 虚拟字段
  id: string;
}

export const MembershipSchema = SchemaFactory.createForClass(Membership);

// 添加虚拟字段
addVirtualId(MembershipSchema);
