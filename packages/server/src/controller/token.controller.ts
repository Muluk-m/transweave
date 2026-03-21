import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '../jwt/guard';
import { CurrentUser, UserPayload } from '../jwt/current-user.decorator';
import { TokenService } from '../service/token.service';
import { ProjectService } from '../service/project.service';
import { MembershipService } from '../service/membership.service';
import { QaCheckService } from '../service/qa-check.service';
import { GlossaryService } from '../service/glossary.service';

@Controller('api/tokens')
export class TokenController {
  constructor(
    private readonly tokenService: TokenService,
    private readonly projectService: ProjectService,
    private readonly membershipService: MembershipService,
    private readonly qaCheckService: QaCheckService,
    private readonly glossaryService: GlossaryService,
  ) {}

  /**
   * Verify the user has permission to access the project.
   * Checks team membership via the project's teamId.
   */
  private async checkPermission(
    projectId: string,
    userId: string,
  ): Promise<void> {
    const hasPermission =
      await this.projectService.checkUserProjectPermission(projectId, userId);
    if (!hasPermission) {
      throw new ForbiddenException(
        'You do not have permission to access this project',
      );
    }
  }

  // ============= Static-prefix routes first (NestJS matches top-to-bottom) =============

  /**
   * GET /api/tokens/detail/:tokenId
   * Get a single token by ID with history.
   */
  @Get('detail/:tokenId')
  @UseGuards(AuthGuard)
  async getToken(
    @Param('tokenId') tokenId: string,
    @CurrentUser() user: UserPayload,
  ) {
    const token = await this.tokenService.findById(tokenId);
    await this.checkPermission(token.projectId, user.userId);
    return token;
  }

  /**
   * POST /api/tokens/qa-check
   * Run QA checks on a single token.
   */
  @Post('qa-check')
  @UseGuards(AuthGuard)
  async qaCheck(
    @Body()
    data: {
      tokenId: string;
      sourceText: string;
      sourceLang: string;
      translations: Record<string, string>;
      projectId: string;
    },
    @CurrentUser() user: UserPayload,
  ) {
    await this.checkPermission(data.projectId, user.userId);
    const project =
      await this.projectService.findProjectById(data.projectId);
    if (!project) throw new BadRequestException('Project not found');

    let glossaryTerms;
    try {
      const allTerms = await this.glossaryService.resolveForProject(
        data.projectId,
        project.teamId,
      );
      glossaryTerms = this.glossaryService.filterMatchingTerms(
        allTerms,
        data.sourceText,
      );
    } catch {
      // Continue without glossary
    }

    return this.qaCheckService.checkToken({
      tokenId: data.tokenId,
      sourceText: data.sourceText,
      sourceLang: data.sourceLang,
      translations: data.translations,
      glossaryTerms,
    });
  }

  /**
   * POST /api/tokens/qa-check-all
   * Run QA checks on all tokens in a project.
   */
  @Post('qa-check-all')
  @UseGuards(AuthGuard)
  async qaCheckAll(
    @Body() data: { projectId: string },
    @CurrentUser() user: UserPayload,
  ) {
    await this.checkPermission(data.projectId, user.userId);
    const project =
      await this.projectService.findProjectById(data.projectId);
    if (!project) throw new BadRequestException('Project not found');

    const tokens = await this.tokenService.findByProject(data.projectId);
    const sourceLang = project.defaultLang || project.languages?.[0] || '';

    let glossaryTerms;
    try {
      glossaryTerms = await this.glossaryService.resolveForProject(
        data.projectId,
        project.teamId,
      );
    } catch {
      // Continue without glossary
    }

    const results = tokens.map((token) => {
      const sourceText = token.translations?.[sourceLang] || '';
      const matchingTerms = glossaryTerms
        ? this.glossaryService.filterMatchingTerms(glossaryTerms, sourceText)
        : undefined;

      return this.qaCheckService.checkToken({
        tokenId: token.id,
        sourceText,
        sourceLang,
        translations: (token.translations as Record<string, string>) || {},
        glossaryTerms: matchingTerms,
      });
    });

    const total = results.length;
    const passed = results.filter((r) => r.passed).length;
    const failed = total - passed;

    return { results, summary: { total, passed, failed } };
  }

  /**
   * POST /api/tokens/bulk
   * Bulk operations: delete, set-tags, set-module.
   * Must be defined BEFORE parameterized routes.
   */
  @Post('bulk')
  @UseGuards(AuthGuard)
  async bulkOperation(
    @Body()
    data: {
      tokenIds: string[];
      operation: 'delete' | 'set-tags' | 'set-module';
      payload?: {
        tags?: string[];
        module?: string | null;
      };
    },
    @CurrentUser() user: UserPayload,
  ) {
    if (!data.tokenIds || data.tokenIds.length === 0) {
      throw new BadRequestException('No tokens provided');
    }

    // Get first token to determine project for permission check
    const firstToken = await this.tokenService.findById(data.tokenIds[0]);
    await this.checkPermission(firstToken.projectId, user.userId);

    switch (data.operation) {
      case 'delete':
        return this.tokenService.bulkDelete(data.tokenIds, user.userId);
      case 'set-tags':
        if (!data.payload?.tags) {
          throw new BadRequestException('Tags required for set-tags operation');
        }
        return this.tokenService.bulkUpdateTags(
          data.tokenIds,
          data.payload.tags,
          user.userId,
        );
      case 'set-module':
        return this.tokenService.bulkUpdateModule(
          data.tokenIds,
          data.payload?.module ?? null,
          user.userId,
        );
      default:
        throw new BadRequestException(
          `Unknown operation: ${(data as any).operation}`,
        );
    }
  }

  /**
   * POST /api/tokens
   * Create a new token.
   */
  @Post()
  @UseGuards(AuthGuard)
  async createToken(
    @Body()
    data: {
      projectId: string;
      key: string;
      module?: string;
      tags?: string[];
      comment?: string;
      translations?: Record<string, string>;
      screenshots?: string[];
    },
    @CurrentUser() user: UserPayload,
  ) {
    await this.checkPermission(data.projectId, user.userId);
    return this.tokenService.create({
      ...data,
      userId: user.userId,
    });
  }

  /**
   * PUT /api/tokens/:tokenId
   * Update an existing token.
   */
  @Put(':tokenId')
  @UseGuards(AuthGuard)
  async updateToken(
    @Param('tokenId') tokenId: string,
    @Body()
    data: {
      key?: string;
      module?: string;
      tags?: string[];
      comment?: string;
      translations?: Record<string, string>;
      screenshots?: string[];
    },
    @CurrentUser() user: UserPayload,
  ) {
    const token = await this.tokenService.findById(tokenId);
    await this.checkPermission(token.projectId, user.userId);
    return this.tokenService.update(tokenId, {
      ...data,
      userId: user.userId,
    });
  }

  /**
   * DELETE /api/tokens/:tokenId
   * Delete a token.
   */
  @Delete(':tokenId')
  @UseGuards(AuthGuard)
  async deleteToken(
    @Param('tokenId') tokenId: string,
    @CurrentUser() user: UserPayload,
  ) {
    const token = await this.tokenService.findById(tokenId);
    await this.checkPermission(token.projectId, user.userId);
    return this.tokenService.delete(tokenId, user.userId);
  }

  /**
   * POST /api/tokens/:tokenId/restore/:historyId
   */
  @Post(':tokenId/restore/:historyId')
  @UseGuards(AuthGuard)
  async restoreToken(
    @Param('tokenId') tokenId: string,
    @Param('historyId') historyId: string,
    @CurrentUser() user: UserPayload,
  ) {
    const token = await this.tokenService.findById(tokenId);
    await this.checkPermission(token.projectId, user.userId);
    return this.tokenService.restore(tokenId, historyId, user.userId);
  }

  // ============= Parameterized sub-path routes =============

  /**
   * GET /api/tokens/:projectId/tags
   * Get all unique tags used by tokens in a project.
   */
  @Get(':projectId/tags')
  @UseGuards(AuthGuard)
  async getProjectTags(
    @Param('projectId') projectId: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.checkPermission(projectId, user.userId);
    return this.tokenService.getProjectTags(projectId);
  }

  /**
   * GET /api/tokens/:projectId/module-stats
   * Get token count per module for a project.
   */
  @Get(':projectId/module-stats')
  @UseGuards(AuthGuard)
  async getModuleStats(
    @Param('projectId') projectId: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.checkPermission(projectId, user.userId);
    return this.tokenService.getModuleStats(projectId);
  }

  /**
   * GET /api/tokens/:projectId/search
   * Search and filter tokens with pagination and sorting.
   */
  @Get(':projectId/search')
  @UseGuards(AuthGuard)
  async searchTokens(
    @Param('projectId') projectId: string,
    @Query('q') query?: string,
    @Query('module') module?: string,
    @Query('status') status?: 'all' | 'completed' | 'incomplete',
    @Query('language') language?: string,
    @Query('tags') tags?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @CurrentUser() user?: UserPayload,
  ) {
    await this.checkPermission(projectId, user!.userId);

    const result = await this.tokenService.search(projectId, {
      query,
      module,
      status: status || 'all',
      language,
      tags: tags ? tags.split(',').map((t) => t.trim()) : undefined,
      page: page ? parseInt(page, 10) : 1,
      perPage: perPage ? Math.min(parseInt(perPage, 10), 200) : 50,
      sortBy: sortBy || 'createdAt',
      sortOrder: sortOrder || 'desc',
    });

    const parsedPerPage = perPage ? Math.min(parseInt(perPage, 10), 200) : 50;

    return {
      tokens: result.tokens,
      total: result.total,
      page: page ? parseInt(page, 10) : 1,
      perPage: parsedPerPage,
      totalPages: Math.ceil(result.total / parsedPerPage),
    };
  }

  /**
   * GET /api/tokens/:projectId/progress
   * Per-language completion percentages.
   */
  @Get(':projectId/progress')
  @UseGuards(AuthGuard)
  async getProgress(
    @Param('projectId') projectId: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.checkPermission(projectId, user.userId);
    return this.tokenService.getLanguageCompletion(projectId);
  }

  /**
   * GET /api/tokens/:tokenId/history
   * Get token change history with user details.
   */
  @Get(':tokenId/history')
  @UseGuards(AuthGuard)
  async getTokenHistory(
    @Param('tokenId') tokenId: string,
    @CurrentUser() user: UserPayload,
  ) {
    const token = await this.tokenService.findById(tokenId);
    await this.checkPermission(token.projectId, user.userId);
    return token.history;
  }

  /**
   * GET /api/tokens/:projectId
   * Get all tokens for a project with history.
   * NOTE: This catch-all route MUST be last among GET :param routes.
   */
  @Get(':projectId')
  @UseGuards(AuthGuard)
  async getProjectTokens(
    @Param('projectId') projectId: string,
    @CurrentUser() user: UserPayload,
  ) {
    await this.checkPermission(projectId, user.userId);
    return this.tokenService.findByProject(projectId);
  }
}
