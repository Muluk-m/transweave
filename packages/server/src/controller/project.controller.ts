/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-base-to-string */
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Logger,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  Res,
  Header,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ProjectService } from '../service/project.service';
import { AuthGuard } from '../jwt/guard';
import { CurrentUser, UserPayload } from '../jwt/current-user.decorator';
import { Response } from 'express';
import { TeamService } from 'src/service/team.service';
import type { SupportedExportFormat } from 'src/utils/formats/types';
import { CreateProjectDto, UpdateProjectDto, ExportProjectDto, ImportProjectDto, MigrateLanguagesDto } from '../dto/project.dto';

@Controller('api/project')
export class ProjectController {
  constructor(
    private projectService: ProjectService,
    private teamService: TeamService,
  ) {}

  @Post('create')
  @UseGuards(AuthGuard)
  async createProject(
    @CurrentUser() user: UserPayload,
    @Body() data: CreateProjectDto,
  ) {
    
    return this.projectService.createProject({
      ...data,
      userId: user.userId,
    });
  }

  @Get('all')
  @UseGuards(AuthGuard)
  async findAllProjects(@CurrentUser() user: UserPayload) {
    // Only return projects the user has access to via their teams
    const teams = await this.teamService.findTeamsByUserId(user.userId);
    const projects: any[] = [];
    for (const team of teams) {
      const teamProjects = await this.projectService.findProjectsByTeamId(team.id);
      projects.push(...teamProjects);
    }
    return projects;
  }

  @Get('find/:id')
  @UseGuards(AuthGuard)
  async findProjectById(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    const project = await this.projectService.findProjectById(id);
    if (!project) {
      throw new NotFoundException('Can not find the project');
    }
    const hasPermission = await this.projectService.checkUserProjectPermission(id, user.userId);
    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to access this project');
    }
    const memberships = await this.teamService.getTeamMembers(project.teamId);
    return { ...project, memberships };
  }

  @Put('update/:id')
  @UseGuards(AuthGuard)
  async updateProject(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
    @Body() data: UpdateProjectDto,
  ) {
    return this.projectService.updateProject(id, {
      ...data,
      userId: user.userId,
    });
  }

  @Delete('delete/:id')
  @UseGuards(AuthGuard)
  async deleteProject(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    return this.projectService.deleteProject(id, user.userId);
  }

  @Get('team/:teamId')
  @UseGuards(AuthGuard)
  async findProjectsByTeamId(@Param('teamId') teamId: string) {
    return this.projectService.findProjectsByTeamId(teamId);
  }

  @Post('language/:id')
  @UseGuards(AuthGuard)
  async addLanguage(@Param('id') id: string, @Body() data: { language: string }, @CurrentUser() user: UserPayload) {
    return this.projectService.addLanguage(id, data.language, user.userId);
  }

  @Delete('language/:id/:language')
  @UseGuards(AuthGuard)
  async removeLanguage(@Param('id') id: string, @Param('language') language: string, @CurrentUser() user: UserPayload) {
    return this.projectService.removeLanguage(id, language, user.userId);
  }

  // Module management
  @Post('module/:id')
  @UseGuards(AuthGuard)
  async addModule(
    @Param('id') id: string,
    @Body() data: { name: string; code: string },
    @CurrentUser() user: UserPayload,
  ) {
    return this.projectService.addModule(
      id,
      { name: data.name, code: data.code },
      user.userId,
    );
  }

  @Delete('module/:id/:module')
  @UseGuards(AuthGuard)
  async removeModule(@Param('id') id: string, @Param('module') module: string, @CurrentUser() user: UserPayload) {
    return this.projectService.removeModule(id, module, user.userId);
  }

  // Check if user has permission to read/write project
  @Get('check/:id')
  @UseGuards(AuthGuard)
  async checkProjectPermission(@Param('id') projectId: string, @CurrentUser() user: UserPayload) {
    return await this.projectService.checkUserProjectPermission(projectId, user.userId);
  }

  // ============= Token APIs moved to TokenController =============
  // See: packages/server/src/controller/token.controller.ts

  // Export project content
  @Post('export/:projectId')
  @UseGuards(AuthGuard)
  @Header('Content-Type', 'application/zip')
  async exportProject(
    @Param('projectId') projectId: string,
    @Body() data: ExportProjectDto,
    @CurrentUser() user: UserPayload,
    @Res() res: Response,
  ) {
    // Verify permission
    const hasPermission = await this.projectService.checkUserProjectPermission(projectId, user.userId);
    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to export this project');
    }

    try {
      // Call service to export data as ZIP package
      const zipBuffer = await this.projectService.exportProjectTokens(projectId, data);

      // Set response headers
      res.setHeader('Content-Disposition', `attachment; filename="translations-${projectId}.zip"`);
      res.setHeader('Content-Type', 'application/zip');

      // Send ZIP file
      return res.send(zipBuffer);
    } catch (error) {
      Logger.error(`Export failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Directly download project content via URL (supports Bearer token auth)
  @Get('download/:projectId')
  @UseGuards(AuthGuard)
  @Header('Content-Type', 'application/zip')
  async downloadProject(
    @Param('projectId') projectId: string,
    @Query('format') format: SupportedExportFormat = 'json',
    @Query('scope')
    scope: 'all' | 'completed' | 'incomplete' | 'custom' = 'all',
    @Query('languages') languages: string,
    @Query('showEmptyTranslations') showEmptyTranslations: string,
    @Query('prettify') prettify: string,
    @Query('includeMetadata') includeMetadata: string,
    @CurrentUser() user: UserPayload,
    @Res() res: Response,
  ) {
    try {
      // Verify project permission
      const hasPermission = await this.projectService.checkUserProjectPermission(projectId, user.userId);
      if (!hasPermission) {
        throw new ForbiddenException('You do not have permission to download this project');
      }

      // Process query parameters
      const exportConfig = {
        format,
        scope,
        languages: languages ? languages.split(',') : undefined,
        showEmptyTranslations: showEmptyTranslations === 'true',
        prettify: prettify === 'true',
        includeMetadata: includeMetadata === 'true',
      };

      // Call service to export data as ZIP package
      const zipBuffer = await this.projectService.exportProjectTokens(projectId, exportConfig);

      // Set response headers
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      res.setHeader('Content-Disposition', `attachment; filename="translations-${projectId}-${timestamp}.zip"`);
      res.setHeader('Content-Type', 'application/zip');

      // Send ZIP file
      return res.send(zipBuffer);
    } catch (error) {
      Logger.error(`Download failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Preview import before actually importing
  @Post('import/preview/:projectId')
  @UseGuards(AuthGuard)
  async previewImport(
    @Param('projectId') projectId: string,
    @Body() data: ImportProjectDto,
    @CurrentUser() user: UserPayload,
  ) {
    // Verify permission
    const hasPermission = await this.projectService.checkUserProjectPermission(projectId, user.userId);
    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to preview import for this project');
    }

    try {
      const changes = await this.projectService.previewImportTokens(projectId, data);
      return {
        success: true,
        changes,
      };
    } catch (error) {
      Logger.error(`Import preview failed: ${error.message}`, error.stack);
      throw new BadRequestException(`Import preview failed: ${error.message}`);
    }
  }

  // Import project content
  @Post('import/:projectId')
  @UseGuards(AuthGuard)
  async importProject(
    @Param('projectId') projectId: string,
    @Body() data: ImportProjectDto,
    @CurrentUser() user: UserPayload,
  ) {
    // Verify permission
    const hasPermission = await this.projectService.checkUserProjectPermission(projectId, user.userId);
    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to import content to this project');
    }

    try {
      const result = await this.projectService.importProjectTokens(projectId, {
        ...data,
        userId: user.userId,
      });
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      Logger.error(`Import failed: ${error.message}`, error.stack);
      throw new BadRequestException(`Import failed: ${error.message}`);
    }
  }

  // Migrate language codes in project
  @Post('migrate-languages/:projectId')
  @UseGuards(AuthGuard)
  async migrateLanguages(
    @Param('projectId') projectId: string,
    @Body() data: MigrateLanguagesDto,
    @CurrentUser() user: UserPayload,
  ) {
    // Verify permission
    const hasPermission = await this.projectService.checkUserProjectPermission(projectId, user.userId);
    if (!hasPermission) {
      throw new ForbiddenException('You do not have permission to migrate languages in this project');
    }

    try {
      const result = await this.projectService.migrateLanguageCodes(projectId, {
        ...data,
        userId: user.userId,
      });
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      Logger.error(`Language migration failed: ${error.message}`, error.stack);
      throw new BadRequestException(`Language migration failed: ${error.message}`);
    }
  }
}
