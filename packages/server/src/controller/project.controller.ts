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
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ProjectService } from '../service/project.service';
import { AuthGuard } from '../jwt/guard';
import { CurrentUser, UserPayload } from '../jwt/current-user.decorator';
import { Response } from 'express';
import { UserService } from 'src/service/user.service';
import { TeamService } from 'src/service/team.service';

@Controller('api/project')
export class ProjectController {
  constructor(
    private projectService: ProjectService,
    private userService: UserService,
    private teamService: TeamService,
  ) {}

  @Post('create')
  @UseGuards(AuthGuard)
  async createProject(
    @CurrentUser() user: UserPayload,
    @Body()
    data: {
      name: string;
      teamId: string;
      url: string;
      description?: string;
      languages?: string[];
    },
  ) {
    
    return this.projectService.createProject({
      ...data,
      userId: user.userId,
    });
  }

  @Get('all')
  async findAllProjects() {
    return this.projectService.findAllProjects();
  }

  @Get('find/:id')
  async findProjectById(@Param('id') id: string) {
    const project = await this.projectService.findProjectById(id);
    if (!project) {
      throw new NotFoundException('Can not find the project');
    }
    const projectObject = project.toObject()
    const memberships = await this.teamService.getTeamMembers(projectObject.teamId);
    projectObject.memberships = memberships
    
    return projectObject;
  }

  @Put('update/:id')
  @UseGuards(AuthGuard)
  async updateProject(
    @CurrentUser() user: UserPayload,
    @Param('id') id: string,
    @Body()
    data: {
      name?: string;
      description?: string;
      languages?: string[];
      languageLabels?: Record<string, string>; // 自定义语言的中文备注
      modules?: Array<{ name: string; code: string }>;
      url?: string;
    },
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
    @Body()
    data: {
      format: 'json' | 'csv' | 'xml' | 'yaml'; // Export format
      scope?: 'all' | 'completed' | 'incomplete' | 'custom'; // Export scope
      languages?: string[]; // Selected languages
      showEmptyTranslations?: boolean; // Whether to include empty translations
      prettify?: boolean; // Beautify output
      includeMetadata?: boolean; // Whether to include metadata
    },
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

  // Directly download project content via URL (supports direct download in browser)
  @Get('download/:projectId')
  @Header('Content-Type', 'application/zip')
  async downloadProject(
    @Param('projectId') projectId: string,
    @Query('format') format: 'json' | 'csv' | 'xml' | 'yaml' = 'json', // Default to json
    @Query('scope')
    scope: 'all' | 'completed' | 'incomplete' | 'custom' = 'all',
    @Query('languages') languages: string, // Comma-separated language list, e.g. 'zh,en,ja'
    @Query('showEmptyTranslations') showEmptyTranslations: string,
    @Query('prettify') prettify: string,
    @Query('includeMetadata') includeMetadata: string,
    @Query('username') username: string, // Username
    @Query('password') password: string, // Password
    @Query('apiKey') apiKey: string, // Optional API key
    @Res() res: Response,
  ) {
    try {
      // First try to authenticate user
      let userId: string;

      // If apiKey is provided, use apiKey for verification first
      // if (apiKey) {
      //   const apiKeyInfo = await this.userService.validateApiKey(apiKey, projectId);
      //   if (!apiKeyInfo) {
      //     throw new UnauthorizedException('API key is invalid or expired');
      //   }
      //   userId = apiKeyInfo.userId;
      // }
      // Otherwise, use username and password for verification
      if (username && password) {
        const user = await this.userService.validateUser(username, password);
        if (!user) {
          throw new UnauthorizedException('Username or password incorrect');
        }
        userId = user.id;
      } else {
        throw new UnauthorizedException(
          'Please provide valid authentication information (username/password or API key)',
        );
      }

      // Verify project permission
      const hasPermission = await this.projectService.checkUserProjectPermission(projectId, userId);
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
    @Body()
    data: {
      language: string; // Language to import
      content: string; // File content
      format: 'json' | 'csv' | 'xml' | 'yaml'; // Import format
      mode: 'append' | 'replace'; // Import mode
    },
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
    @Body()
    data: {
      language: string; // Language to import
      content: string; // File content
      format: 'json' | 'csv' | 'xml' | 'yaml'; // Import format
      mode: 'append' | 'replace'; // Import mode
    },
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
    @Body()
    data: {
      languageMapping: Record<string, string>; // Map from old language code/name to new code
    },
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
