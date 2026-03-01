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
import { DrizzleModule } from './db/drizzle.module';
import { HttpModule } from '@nestjs/axios';
import { AiModule } from './ai/ai.module';
import { AuthService } from './service/auth.service';
import { RequestIdMiddleware } from './middleware/request-id.middleware';
import { ActivityLogService } from './service/activity-log.service';
import { ActivityLogController } from './controller/activity-log.controller';
import { McpService } from './service/mcp.service';
import { McpController } from './controller/mcp.controller';
import { FileStorageModule } from './modules/file-storage.module';
import { TokenService } from './service/token.service';
import { TokenController } from './controller/token.controller';
import { ApiKeyService } from './service/api-key.service';
import { ApiKeyController } from './controller/api-key.controller';

@Module({
  imports: [
    PassportModule,
    DatabaseModule,
    DrizzleModule,
    HttpModule,
    FileStorageModule,
    AiModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15d' },
    }),
  ],
  controllers: [
    AppController,
    UserController,
    AuthController,
    TeamController,
    ProjectController,
    UserController,
    ActivityLogController,
    McpController,
    TokenController,
    ApiKeyController,
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
    ActivityLogService,
    McpService,
    TokenService,
    ApiKeyService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
