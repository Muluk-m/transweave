import { Inject, Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/drizzle.provider';
import type { DrizzleDB } from '../db/drizzle.types';
import { AuthService } from './auth.service';
import { TeamService } from './team.service';
import { ProjectService } from './project.service';
import { TokenService } from './token.service';
import { DEMO_TOKENS } from './seed-data';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly authService: AuthService,
    private readonly teamService: TeamService,
    private readonly projectService: ProjectService,
    private readonly tokenService: TokenService,
  ) {}

  async resetAndSeed(): Promise<void> {
    this.logger.log('Starting database reset and seed...');

    // 1. Truncate all tables
    await (this.db as any).execute(
      sql`TRUNCATE TABLE activity_logs, token_history, tokens, api_keys, files, projects, memberships, teams, users CASCADE`,
    );
    this.logger.log('All tables truncated');

    // 2. Create demo admin user
    const { user } = await this.authService.register({
      name: 'Demo Admin',
      email: 'admin@test.com',
      password: 'admin123456',
      isAdmin: true,
    });
    const userId = (user as any).id;
    this.logger.log(`Demo user created: ${userId}`);

    // 3. Create demo team
    const team = await this.teamService.createTeam({
      name: 'Demo Team',
      url: 'demo-team',
      userId,
    });
    this.logger.log(`Demo team created: ${team.id}`);

    // 4. Create demo project
    const project = await this.projectService.createProject({
      name: 'Transweave',
      teamId: team.id,
      url: 'transweave',
      description: 'Transweave platform i18n — dogfooding our own product for demo purposes.',
      languages: ['en', 'zh-CN', 'ja', 'ko', 'fr'],
      userId,
    });
    this.logger.log(`Demo project created: ${project.id}`);

    // 5. Create sample tokens
    for (const tokenData of DEMO_TOKENS) {
      await this.tokenService.create({
        projectId: project.id,
        key: tokenData.key,
        translations: tokenData.translations,
        tags: tokenData.tags,
        module: tokenData.module,
        comment: tokenData.comment,
        userId,
      });
    }
    this.logger.log(`${DEMO_TOKENS.length} demo tokens created`);
    this.logger.log('Database reset and seed complete');
  }
}
