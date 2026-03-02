import { Global, Module } from '@nestjs/common';
import { DrizzleProvider, DRIZZLE } from './drizzle.provider';
import { UserRepository } from '../repository/user.repository';
import { TeamRepository } from '../repository/team.repository';
import { MembershipRepository } from '../repository/membership.repository';
import { ProjectRepository } from '../repository/project.repository';
import { TokenRepository } from '../repository/token.repository';
import { TokenHistoryRepository } from '../repository/token-history.repository';
import { ActivityLogRepository } from '../repository/activity-log.repository';
import { ApiKeyRepository } from '../repository/api-key.repository';
import { ApiKeyService } from '../service/api-key.service';

@Global()
@Module({
  providers: [
    DrizzleProvider,
    UserRepository,
    TeamRepository,
    MembershipRepository,
    ProjectRepository,
    TokenRepository,
    TokenHistoryRepository,
    ActivityLogRepository,
    ApiKeyRepository,
    ApiKeyService,
  ],
  exports: [
    DRIZZLE,
    UserRepository,
    TeamRepository,
    MembershipRepository,
    ProjectRepository,
    TokenRepository,
    TokenHistoryRepository,
    ActivityLogRepository,
    ApiKeyRepository,
    ApiKeyService,
  ],
})
export class DrizzleModule {}
