import { Document } from 'mongoose';

// 定义通用的可序列化方法，解决 toObject 方法的类型问题
declare module 'mongoose' {
  interface Document {
    toObject<T = any>(): T;
  }
}
