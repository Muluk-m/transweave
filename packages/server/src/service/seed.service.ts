import { Inject, Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DRIZZLE } from '../db/drizzle.provider';
import type { DrizzleDB } from '../db/drizzle.types';
import { AuthService } from './auth.service';
import { TeamService } from './team.service';
import { ProjectService } from './project.service';
import { TokenService } from './token.service';

const DEMO_TOKENS: Array<{
  key: string;
  translations: Record<string, string>;
  tags: string[];
  module: string;
  comment?: string;
}> = [
  {
    key: 'common.greeting',
    translations: {
      en: 'Hello',
      'zh-CN': '你好',
      ja: 'こんにちは',
      ko: '안녕하세요',
      fr: 'Bonjour',
    },
    tags: ['common', 'greeting'],
    module: 'common',
    comment: 'General greeting message',
  },
  {
    key: 'common.goodbye',
    translations: {
      en: 'Goodbye',
      'zh-CN': '再见',
      ja: 'さようなら',
      ko: '안녕히 가세요',
      fr: 'Au revoir',
    },
    tags: ['common'],
    module: 'common',
    comment: 'Farewell message',
  },
  {
    key: 'common.welcome',
    translations: {
      en: 'Welcome to {appName}',
      'zh-CN': '欢迎使用 {appName}',
      ja: '{appName} へようこそ',
      ko: '{appName}에 오신 것을 환영합니다',
      fr: 'Bienvenue sur {appName}',
    },
    tags: ['common', 'onboarding'],
    module: 'common',
    comment: 'Welcome message with app name interpolation',
  },
  {
    key: 'nav.home',
    translations: { en: 'Home', 'zh-CN': '首页', ja: 'ホーム', ko: '홈', fr: 'Accueil' },
    tags: ['navigation'],
    module: 'nav',
  },
  {
    key: 'nav.settings',
    translations: { en: 'Settings', 'zh-CN': '设置', ja: '設定', ko: '설정', fr: 'Paramètres' },
    tags: ['navigation'],
    module: 'nav',
  },
  {
    key: 'nav.profile',
    translations: { en: 'Profile', 'zh-CN': '个人资料', ja: 'プロフィール', ko: '프로필', fr: 'Profil' },
    tags: ['navigation'],
    module: 'nav',
  },
  {
    key: 'auth.login',
    translations: { en: 'Login', 'zh-CN': '登录', ja: 'ログイン', ko: '로그인', fr: 'Connexion' },
    tags: ['auth', 'button'],
    module: 'auth',
  },
  {
    key: 'auth.logout',
    translations: { en: 'Logout', 'zh-CN': '退出登录', ja: 'ログアウト', ko: '로그아웃', fr: 'Déconnexion' },
    tags: ['auth', 'button'],
    module: 'auth',
  },
  {
    key: 'auth.register',
    translations: { en: 'Create Account', 'zh-CN': '创建账号', ja: 'アカウント作成', ko: '계정 만들기', fr: 'Créer un compte' },
    tags: ['auth', 'button'],
    module: 'auth',
  },
  {
    key: 'form.submit',
    translations: { en: 'Submit', 'zh-CN': '提交', ja: '送信', ko: '제출', fr: 'Soumettre' },
    tags: ['form', 'button'],
    module: 'form',
  },
  {
    key: 'form.cancel',
    translations: { en: 'Cancel', 'zh-CN': '取消', ja: 'キャンセル', ko: '취소', fr: 'Annuler' },
    tags: ['form', 'button'],
    module: 'form',
  },
  {
    key: 'form.save',
    translations: { en: 'Save Changes', 'zh-CN': '保存更改', ja: '変更を保存' },
    tags: ['form', 'button'],
    module: 'form',
    comment: 'Partially translated - missing ko & fr',
  },
  {
    key: 'error.notFound',
    translations: { en: 'Page not found', 'zh-CN': '页面未找到' },
    tags: ['error'],
    module: 'error',
    comment: 'Only 2 languages translated to demonstrate progress tracking',
  },
  {
    key: 'error.serverError',
    translations: { en: 'Something went wrong. Please try again later.' },
    tags: ['error'],
    module: 'error',
    comment: 'Only English - needs translation',
  },
  {
    key: 'dashboard.totalUsers',
    translations: {
      en: '{count} users',
      'zh-CN': '{count} 个用户',
      ja: '{count} ユーザー',
      ko: '{count}명의 사용자',
      fr: '{count} utilisateurs',
    },
    tags: ['dashboard', 'stats'],
    module: 'dashboard',
    comment: 'Pluralized user count with interpolation',
  },
];

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
      name: 'Demo App',
      teamId: team.id,
      url: 'demo-app',
      description: 'A demo project showcasing Transweave i18n management — feel free to explore!',
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
