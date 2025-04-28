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
} from '../models';

@Module({
  imports: [
    MongooseModule.forRoot(
      'mongodb://admin:secret@localhost:27017/bondma?authSource=admin&replicaSet=rs0',
      // process.env.DATABASE_URL || 'mongodb://localhost:27017/bondma',
    ),
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
