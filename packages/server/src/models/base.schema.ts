import { SchemaOptions } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';

export const baseSchemaOptions: SchemaOptions = {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret) => {
      delete ret._id;
      delete ret.__v;
      
      // 转换 Map 类型为普通对象
      Object.keys(ret).forEach(key => {
        if (ret[key] instanceof Map) {
          ret[key] = Object.fromEntries(ret[key]);
        }
      });
      
      return ret;
    },
  },
  toObject: {
    virtuals: true,
    transform: (_doc, ret) => {
      delete ret._id;
      delete ret.__v;
      
      // 转换 Map 类型为普通对象
      Object.keys(ret).forEach(key => {
        if (ret[key] instanceof Map) {
          ret[key] = Object.fromEntries(ret[key]);
        }
      });
      
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
