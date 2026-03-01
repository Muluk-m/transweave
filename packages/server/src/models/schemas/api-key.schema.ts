import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { baseSchemaOptions, addVirtualId } from '../base.schema';
import { User } from './user.schema';

export type ApiKeyDocument = ApiKey & Document;

@Schema(baseSchemaOptions)
export class ApiKey {
  @Prop({ type: MongooseSchema.Types.ObjectId, auto: true })
  _id: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  keyPrefix: string;

  @Prop({ required: true })
  keyHash: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ type: [String], default: ['read', 'write'] })
  scopes: string[];

  @Prop()
  expiresAt: Date;

  @Prop()
  lastUsedAt: Date;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  // Virtual field
  id: string;
}

export const ApiKeySchema = SchemaFactory.createForClass(ApiKey);

addVirtualId(ApiKeySchema);
