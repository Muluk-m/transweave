import { Module } from '@nestjs/common';
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
  TokenHistory,
  TokenHistorySchema,
  ActivityLog,
  ActivityLogSchema,
} from '../models';

@Module({
  imports: [
    (() => {
      const dbUrl =
        process.env.DATABASE_URL || 'mongodb://admin:secret@localhost:27017/bondma?authSource=admin&replicaSet=rs0';
      return MongooseModule.forRoot(dbUrl, {
        authMechanism: 'SCRAM-SHA-1',
        bufferCommands: false,
        autoCreate: true,
        autoIndex: false,
      });
    })(),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Team.name, schema: TeamSchema },
      { name: Membership.name, schema: MembershipSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Token.name, schema: TokenSchema },
      { name: TokenHistory.name, schema: TokenHistorySchema },
      { name: ActivityLog.name, schema: ActivityLogSchema },
    ]),
  ],
  exports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Team.name, schema: TeamSchema },
      { name: Membership.name, schema: MembershipSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Token.name, schema: TokenSchema },
      { name: TokenHistory.name, schema: TokenHistorySchema },
      { name: ActivityLog.name, schema: ActivityLogSchema },
    ]),
  ],
})
export class DatabaseModule {}
