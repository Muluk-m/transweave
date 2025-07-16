import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './controller/index.controller';
import { AppService } from './service/index.service';
import { UserService } from './service/user.service';
import { TeamService } from './service/team.service';
import { MongooseService } from './service/mongoose.service';
import { UserController } from './controller/user.controller';
import { AuthController } from './controller/auth.controller';
import { TeamController } from './controller/team.controller';
import { ProjectController } from './controller/project.controller';
import { ProjectService } from './service/project.service';
import { JwtStrategy } from './jwt/strategy';
import { PassportModule } from '@nestjs/passport';
import { MembershipService } from './service/membership.service';
import { DatabaseModule } from './modules/database.module';
import { HttpModule } from '@nestjs/axios';
import { AiService } from './service/ai.service';
import { AiController } from './controller/ai.controller';
import { AuthService } from './service/auth.service';
import { RequestIdMiddleware } from './middleware/request-id.middleware';
import { ActivityLogService } from './service/activity-log.service';
import { ActivityLogController } from './controller/activity-log.controller';

@Module({
  imports: [
    PassportModule,
    DatabaseModule,
    HttpModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '15d' },
    }),
  ],
  controllers: [
    AppController,
    UserController,
    AuthController,
    AiController,
    TeamController,
    ProjectController,
    UserController,
    ActivityLogController,
  ],
  providers: [
    AppService,
    AuthService,
    UserService,
    TeamService,
    MongooseService,
    ProjectService,
    JwtStrategy,
    MembershipService,
    AiService,
    ActivityLogService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
