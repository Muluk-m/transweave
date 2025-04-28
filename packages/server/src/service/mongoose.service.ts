import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class MongooseService implements OnModuleInit, OnModuleDestroy {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async onModuleInit() {
    // 连接已由 MongooseModule 自动建立
    console.log('MongoDB connection established');
    await Promise.resolve(); // 添加 await 表达式以满足 linter 要求
  }

  async onModuleDestroy() {
    await this.connection.close();
    console.log('MongoDB connection closed');
  }

  // 新增获取连接的方法
  getConnection(): Connection {
    return this.connection;
  }
}
