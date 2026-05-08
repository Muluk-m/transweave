import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ProjectRepository } from '../repository/project.repository';
import { TokenRepository } from '../repository/token.repository';
import { MembershipService } from './membership.service';
import { ActivityLogService } from './activity-log.service';
import { GlossaryService } from './glossary.service';
import { ActivityType } from '../db/schema/activity-logs';
import { type Project, type NewProject, type ProjectModule } from '../db/schema/projects';
import { DRIZZLE } from '../db/drizzle.provider';
import type { DrizzleDB } from '../db/drizzle.types';

@Injectable()
export class ProjectService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly projectRepository: ProjectRepository,
    private readonly tokenRepository: TokenRepository,
    private readonly membershipService: MembershipService,
    private readonly activityLogService: ActivityLogService,
    private readonly glossaryService: GlossaryService,
  ) {}

  async createProject(data: {
    name: string;
    teamId: string;
    url: string;
    description?: string;
    languages?: string[];
    userId: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<Project> {
    const project = await this.projectRepository.create({
      name: data.name,
      teamId: data.teamId,
      url: data.url,
      description: data.description,
      languages: data.languages || [],
    });

    await this.activityLogService.create({
      type: ActivityType.PROJECT_CREATE,
      projectId: project.id,
      userId: data.userId,
      details: {
        entityId: project.id,
        entityType: 'project',
        entityName: project.name,
        metadata: {
          languages: project.languages,
          description: project.description,
          url: project.url,
        },
      },
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });

    return project;
  }

  async findAllProjects(): Promise<Project[]> {
    return this.projectRepository.findAll();
  }

  async findProjectById(id: string): Promise<Project | null> {
    return this.projectRepository.findById(id);
  }

  async findProjectsByTeamId(teamId: string): Promise<Project[]> {
    return this.projectRepository.findByTeamId(teamId);
  }

  async findProjectsByUserId(userId: string): Promise<Project[]> {
    return this.projectRepository.findByUserId(userId);
  }

  async updateProject(
    id: string,
    data: {
      name?: string;
      description?: string;
      languages?: string[];
      languageLabels?: Record<string, string>;
      modules?: ProjectModule[];
      url?: string;
      userId: string;
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<Project | null> {
    const oldProject = await this.projectRepository.findById(id);
    if (!oldProject) {
      throw new NotFoundException('项目不存在');
    }

    const { userId, ipAddress, userAgent, ...updateData } = data;

    // 规范化 modules
    if (updateData.modules) {
      const normalizedMap = new Map<string, ProjectModule>();
      (updateData.modules as any[]).forEach((m: any) => {
        if (typeof m === 'string') {
          if (!normalizedMap.has(m)) normalizedMap.set(m, { code: m });
        } else if (m && typeof m.code === 'string') {
          if (!normalizedMap.has(m.code)) {
            normalizedMap.set(m.code, { code: m.code, description: m.description });
          }
        }
      });
      updateData.modules = Array.from(normalizedMap.values());
    }

    const updatedProject = await this.projectRepository.update(id, updateData);

    // Record changes
    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
    for (const field of ['name', 'description', 'url'] as const) {
      if (updateData[field] !== undefined && oldProject[field] !== updateData[field]) {
        changes.push({ field, oldValue: oldProject[field], newValue: updateData[field] });
      }
    }
    if (updateData.languageLabels !== undefined) {
      const oldLabels = oldProject.languageLabels || {};
      if (JSON.stringify(oldLabels) !== JSON.stringify(updateData.languageLabels)) {
        changes.push({ field: 'languageLabels', oldValue: oldLabels, newValue: updateData.languageLabels });
      }
    }
    if (updateData.languages !== undefined) {
      const oldLangs = JSON.stringify(oldProject.languages || []);
      const newLangs = JSON.stringify(updateData.languages);
      if (oldLangs !== newLangs) {
        changes.push({ field: 'languages', oldValue: oldProject.languages, newValue: updateData.languages });
      }
    }

    if (changes.length > 0 && updatedProject) {
      await this.activityLogService.create({
        type: ActivityType.PROJECT_UPDATE,
        projectId: id,
        userId,
        details: {
          entityId: id,
          entityType: 'project',
          entityName: updatedProject.name,
          changes,
        },
        ipAddress,
        userAgent,
      });
    }

    return updatedProject;
  }

  async deleteProject(
    id: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ success: boolean }> {
    const project = await this.projectRepository.findById(id);
    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    const tokenCount = await this.tokenRepository.countByProjectId(id);

    // Log before deletion so the FK reference is still valid
    await this.activityLogService.create({
      type: ActivityType.PROJECT_DELETE,
      projectId: id,
      userId,
      details: {
        entityId: id,
        entityType: 'project',
        entityName: project.name,
        metadata: {
          deletedTokensCount: tokenCount,
          languages: project.languages,
          description: project.description,
        },
      },
      ipAddress,
      userAgent,
    });

    // activity_logs.project_id has onDelete: 'cascade', so deleting the project
    // cascades and removes the log — that's expected for hard deletes.
    await this.tokenRepository.deleteByProjectId(id);
    await this.projectRepository.delete(id);

    return { success: true };
  }

  async addLanguage(
    id: string,
    language: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Project | null> {
    const project = await this.projectRepository.findById(id);
    if (!project) throw new NotFoundException('项目不存在');

    const languages = project.languages || [];
    if (languages.includes(language)) return project;

    const newLanguages = [...languages, language];
    const updated = await this.projectRepository.update(id, { languages: newLanguages });

    await this.activityLogService.create({
      type: ActivityType.PROJECT_LANGUAGE_ADD,
      projectId: id,
      userId,
      details: {
        entityId: id,
        entityType: 'project',
        entityName: project.name,
        language,
        changes: [{ field: 'languages', oldValue: languages, newValue: newLanguages }],
      },
      ipAddress,
      userAgent,
    });

    // Backfill empty translation slots for any auto-sync glossary entries
    // scoped to this project. Best-effort — never block the language add.
    this.glossaryService
      .backfillForLanguage({ projectId: id }, language)
      .catch(() => {});

    return updated;
  }

  async removeLanguage(
    id: string,
    language: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Project | null> {
    const project = await this.projectRepository.findById(id);
    if (!project) throw new NotFoundException('项目不存在');

    const oldLanguages = project.languages || [];
    const newLanguages = oldLanguages.filter((l) => l !== language);
    if (oldLanguages.length === newLanguages.length) return project;

    const updated = await this.projectRepository.update(id, { languages: newLanguages });

    await this.activityLogService.create({
      type: ActivityType.PROJECT_LANGUAGE_REMOVE,
      projectId: id,
      userId,
      details: {
        entityId: id,
        entityType: 'project',
        entityName: project.name,
        language,
        changes: [{ field: 'languages', oldValue: oldLanguages, newValue: newLanguages }],
      },
      ipAddress,
      userAgent,
    });

    return updated;
  }

  async addModule(
    id: string,
    module: ProjectModule,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Project | null> {
    const project = await this.projectRepository.findById(id);
    if (!project) throw new NotFoundException('项目不存在');

    if (!module.code) {
      throw new BadRequestException('模块代码不能为空');
    }
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(module.code)) {
      throw new BadRequestException('模块名只能包含字母、数字和下划线，且必须以字母开头');
    }

    const modules = project.modules || [];
    if (modules.some((m) => m.code === module.code)) {
      throw new BadRequestException('该模块代码已存在');
    }

    const newModules = [...modules, module];
    const updated = await this.projectRepository.update(id, { modules: newModules });

    await this.activityLogService.create({
      type: ActivityType.PROJECT_UPDATE,
      projectId: id,
      userId,
      details: {
        entityId: id,
        entityType: 'project',
        entityName: project.name,
        changes: [{ field: 'modules', oldValue: modules, newValue: newModules }],
        metadata: { action: 'add_module', module },
      },
      ipAddress,
      userAgent,
    });

    return updated;
  }

  async removeModule(
    id: string,
    moduleCode: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Project | null> {
    const project = await this.projectRepository.findById(id);
    if (!project) throw new NotFoundException('项目不存在');

    // Check if any tokens are using this module
    const tokenCount = await this.tokenRepository.countByProjectIdAndModule(
      id,
      moduleCode,
    );
    if (tokenCount > 0) {
      throw new BadRequestException(
        `该模块下还有 ${tokenCount} 个词条，请先移除词条的模块归属`,
      );
    }

    const oldModules = project.modules || [];
    const newModules = oldModules.filter((m) => m.code !== moduleCode);
    if (oldModules.length === newModules.length) return project;

    const updated = await this.projectRepository.update(id, { modules: newModules });

    await this.activityLogService.create({
      type: ActivityType.PROJECT_UPDATE,
      projectId: id,
      userId,
      details: {
        entityId: id,
        entityType: 'project',
        entityName: project.name,
        changes: [{ field: 'modules', oldValue: oldModules, newValue: newModules }],
        metadata: { action: 'remove_module', moduleCode },
      },
      ipAddress,
      userAgent,
    });

    return updated;
  }

  async checkUserProjectPermission(projectId: string, userId: string): Promise<boolean> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) throw new NotFoundException('项目不存在');
    return this.membershipService.isMember(project.teamId, userId);
  }

}
