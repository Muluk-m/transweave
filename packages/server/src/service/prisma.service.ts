import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../prisma/generated/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    console.log('Connecting to database with URL:', process.env.DATABASE_URL);
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
