import { SchemaOptions } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';

export const baseSchemaOptions: SchemaOptions = {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret) => {
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
  toObject: {
    virtuals: true,
    transform: (_doc, ret) => {
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
};

// 为所有 Schema 添加虚拟 ID 设置函数
export function addVirtualId(schema: MongooseSchema): void {
  schema.virtual('id').get(function () {
    return this._id ? this._id.toString() : null;
  });
}
