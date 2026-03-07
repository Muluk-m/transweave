import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './controller/index.controller';
import { AppService } from './service/index.service';
import { UserService } from './service/user.service';
import { TeamService } from './service/team.service';
import { UserController } from './controller/user.controller';
import { AuthController } from './controller/auth.controller';
import { TeamController } from './controller/team.controller';
import { ProjectController } from './controller/project.controller';
import { ProjectService } from './service/project.service';
import { JwtStrategy } from './jwt/strategy';
import { PassportModule } from '@nestjs/passport';
import { MembershipService } from './service/membership.service';
import { DrizzleModule } from './db/drizzle.module';
import { HttpModule } from '@nestjs/axios';
import { AiModule } from './ai/ai.module';
import { AuthService } from './service/auth.service';
import { AuthGuard } from './jwt/guard';
import { RequestIdMiddleware } from './middleware/request-id.middleware';
import { ActivityLogService } from './service/activity-log.service';
import { ActivityLogController } from './controller/activity-log.controller';
import { McpService } from './service/mcp.service';
import { McpController } from './controller/mcp.controller';
import { FileStorageModule } from './modules/file-storage.module';
import { TokenService } from './service/token.service';
import { TokenController } from './controller/token.controller';
import { ApiKeyController } from './controller/api-key.controller';
import { SeedController } from './controller/seed.controller';
import { SeedService } from './service/seed.service';
import { HealthModule } from './health/health.module';
import { requireEnv } from './config/env';

@Module({
  imports: [
    PassportModule,
    DrizzleModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    HttpModule,
    FileStorageModule,
    AiModule,
    HealthModule,
    JwtModule.register({
      global: true,
      secret: requireEnv('JWT_SECRET'),
      signOptions: { expiresIn: '15d' },
    }),
  ],
  controllers: [
    AppController,
    UserController,
    AuthController,
    TeamController,
    ProjectController,
    ActivityLogController,
    McpController,
    TokenController,
    ApiKeyController,
    SeedController,
  ],
  providers: [
    AppService,
    AuthService,
    AuthGuard,
    UserService,
    TeamService,
    ProjectService,
    JwtStrategy,
    MembershipService,
    ActivityLogService,
    McpService,
    TokenService,
    SeedService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
