import { Module, Logger } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  User,
  UserSchema,
  Team,
  TeamSchema,
  Membership,
  MembershipSchema,
  Project,
  ProjectSchema,
  Token,
  TokenSchema,
} from '../models';

@Module({
  imports: [
    (() => {
      const dbUrl =
        process.env.DATABASE_URL || 'mongodb://localhost:27017/bondma';
      Logger.log(`数据库连接地址: ${dbUrl}`, 'DatabaseModule');
      return MongooseModule.forRoot(dbUrl, {
        ssl: true,
        sslValidate: false,
        retryWrites: false,
        replicaSet: 'rs0',
        authMechanism: 'SCRAM-SHA-1',
      } as any);
    })(),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Team.name, schema: TeamSchema },
      { name: Membership.name, schema: MembershipSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Token.name, schema: TokenSchema },
    ]),
  ],
  exports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Team.name, schema: TeamSchema },
      { name: Membership.name, schema: MembershipSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Token.name, schema: TokenSchema },
    ]),
  ],
})
export class DatabaseModule {}
