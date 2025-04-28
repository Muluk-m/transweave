import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { baseSchemaOptions, addVirtualId } from '../base.schema';
import { Membership } from './membership.schema';

export type UserDocument = User & Document;

@Schema(baseSchemaOptions)
export class User {
  @Prop({ type: MongooseSchema.Types.ObjectId, auto: true })
  _id: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Membership' }] })
  memberships: Membership[];

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  // 虚拟字段
  id: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// 添加虚拟字段
addVirtualId(UserSchema);
