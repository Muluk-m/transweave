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
} from '@nestjs/common';
import { AuthGuard } from '../jwt/guard';
import { CurrentUser, UserPayload } from '../jwt/current-user.decorator';
import { TokenService } from '../service/token.service';
import { ProjectService } from '../service/project.service';
import { MembershipService } from '../service/membership.service';

@Controller('api/tokens')
export class TokenController {
  constructor(
    private readonly tokenService: TokenService,
    private readonly projectService: ProjectService,
    private readonly membershipService: MembershipService,
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

  // ============= Parameterized sub-path routes =============

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
