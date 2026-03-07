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
import { ActivityType } from '../db/schema/activity-logs';
import { type Project, type NewProject, type ProjectModule } from '../db/schema/projects';
import { type Token } from '../db/schema/tokens';
import { DRIZZLE } from '../db/drizzle.provider';
import type { DrizzleDB } from '../db/drizzle.types';
import { createZipWithLanguageFiles } from 'src/utils/exportTo';
import { parseImportData } from 'src/utils/importFrom';
import type { SupportedImportFormat, SupportedExportFormat } from 'src/utils/formats/types';

@Injectable()
export class ProjectService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly projectRepository: ProjectRepository,
    private readonly tokenRepository: TokenRepository,
    private readonly membershipService: MembershipService,
    private readonly activityLogService: ActivityLogService,
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
          if (!normalizedMap.has(m)) normalizedMap.set(m, { name: m, code: m });
        } else if (m && typeof m.code === 'string') {
          if (!normalizedMap.has(m.code)) {
            normalizedMap.set(m.code, { name: m.name || m.code, code: m.code });
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

    if (!module.name || !module.code) {
      throw new BadRequestException('模块名称和代码必须齐全');
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

  async exportProjectTokens(
    projectId: string,
    options: {
      format: SupportedExportFormat;
      scope?: 'all' | 'completed' | 'incomplete' | 'custom';
      languages?: string[];
      showEmptyTranslations?: boolean;
      prettify?: boolean;
      includeMetadata?: boolean;
      asZip?: boolean;
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    const project = await this.projectRepository.findById(projectId);
    if (!project) throw new NotFoundException('项目不存在');

    let tokens: Token[] = await this.tokenRepository.findByProjectId(projectId);

    if (options.scope) {
      tokens = this.filterTokensByScope(tokens, options.scope, project.languages || []);
    }

    const targetLanguages =
      options.languages && options.languages.length > 0
        ? options.languages.filter((lang) => (project.languages || []).includes(lang))
        : (project.languages || []);

    let exportTokens: any[] = tokens.map((t) => {
      const translations = (t.translations as Record<string, string>) || {};
      if (options.showEmptyTranslations === false) {
        const filtered: Record<string, string> = {};
        targetLanguages.forEach((lang) => {
          if (translations[lang]) filtered[lang] = translations[lang];
        });
        return { ...t, translations: filtered };
      } else {
        const complete: Record<string, string> = {};
        targetLanguages.forEach((lang) => { complete[lang] = translations[lang] || ''; });
        return { ...t, translations: complete };
      }
    });

    if (!options.includeMetadata) {
      exportTokens = exportTokens.map(({ id, projectId, key, translations }) => ({
        id,
        projectId,
        key,
        translations,
      }));
    }

    const result = await createZipWithLanguageFiles(
      exportTokens,
      { ...project, id: project.id },
      targetLanguages,
      options.format,
      { prettify: options.prettify },
    );

    if (options.userId) {
      await this.activityLogService.create({
        type: ActivityType.PROJECT_EXPORT,
        projectId,
        userId: options.userId,
        details: {
          entityId: projectId,
          entityType: 'project',
          entityName: project.name,
          format: options.format,
          metadata: {
            scope: options.scope || 'all',
            languages: targetLanguages,
            tokensCount: exportTokens.length,
            showEmptyTranslations: options.showEmptyTranslations,
            includeMetadata: options.includeMetadata,
          },
        },
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
      });
    }

    return result;
  }

  async previewImportTokens(
    projectId: string,
    data: {
      language: string;
      content: string;
      format: SupportedImportFormat;
      mode: 'append' | 'replace';
    },
  ) {
    const project = await this.projectRepository.findById(projectId);
    if (!project) throw new NotFoundException('项目不存在');

    if (!(project.languages || []).includes(data.language)) {
      throw new BadRequestException(`项目不支持"${data.language}"语言`);
    }

    const importData = await parseImportData(data.content, data.format, data.language);
    if (!importData || Object.keys(importData).length === 0) {
      throw new BadRequestException('导入的文件不包含有效数据或格式不正确');
    }

    const existingTokens = await this.tokenRepository.findByProjectId(projectId);

    const changes = {
      toAdd: [] as Array<{ key: string; translation: string }>,
      toUpdate: [] as Array<{ key: string; oldTranslation: string; newTranslation: string; tags?: string[]; comment?: string }>,
      toDelete: [] as Array<{ key: string; translation: string }>,
      unchanged: [] as Array<{ key: string; translation: string }>,
      stats: { added: 0, updated: 0, deleted: 0, unchanged: 0, total: Object.keys(importData).length },
    };

    for (const [key, value] of Object.entries(importData)) {
      const existing = existingTokens.find((t) => t.key === key);
      if (!existing) {
        changes.toAdd.push({ key, translation: value });
        changes.stats.added++;
      } else {
        const currentValue = (existing.translations as Record<string, string>)?.[data.language] || '';
        if (currentValue !== value) {
          changes.toUpdate.push({ key, oldTranslation: currentValue, newTranslation: value, tags: (existing.tags as string[]) || [], comment: existing.comment || '' });
          changes.stats.updated++;
        } else {
          changes.unchanged.push({ key, translation: value });
          changes.stats.unchanged++;
        }
      }
    }

    if (data.mode === 'replace') {
      const importKeySet = new Set(Object.keys(importData));
      for (const token of existingTokens) {
        const trans = (token.translations as Record<string, string>) || {};
        if (!importKeySet.has(token.key) && trans[data.language]) {
          changes.toDelete.push({ key: token.key, translation: trans[data.language] });
          changes.stats.deleted++;
        }
      }
    }

    return changes;
  }

  async importProjectTokens(
    projectId: string,
    data: {
      language: string;
      content: string;
      format: SupportedImportFormat;
      mode: 'append' | 'replace';
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    const stats = { added: 0, updated: 0, unchanged: 0, total: 0 };

    const project = await this.projectRepository.findById(projectId);
    if (!project) throw new NotFoundException('项目不存在');

    if (!(project.languages || []).includes(data.language)) {
      throw new BadRequestException(`项目不支持"${data.language}"语言`);
    }

    const importData = await parseImportData(data.content, data.format, data.language);
    if (!importData || Object.keys(importData).length === 0) {
      throw new BadRequestException('导入的文件不包含有效数据或格式不正确');
    }

    const existingTokens = await this.tokenRepository.findByProjectId(projectId);
    stats.total = Object.keys(importData).length;

    for (const [key, value] of Object.entries(importData)) {
      const existing = existingTokens.find((t) => t.key === key);
      if (existing) {
        const translations: Record<string, string> = { ...(existing.translations as Record<string, string> || {}) };
        if (translations[data.language] !== value) {
          translations[data.language] = value;
          await this.tokenRepository.update(existing.id, { translations });
          stats.updated++;
        } else {
          stats.unchanged++;
        }
      } else {
        const translations: Record<string, string> = { [data.language]: value };
        const created = await this.tokenRepository.create({
          projectId,
          key,
          translations,
          tags: [],
          comment: '',
        });
        existingTokens.push(created);
        stats.added++;
      }
    }

    // Replace mode: clear this language from tokens not in importData
    if (data.mode === 'replace') {
      const importKeySet = new Set(Object.keys(importData));
      for (const token of existingTokens) {
        if (!importKeySet.has(token.key)) {
          const translations: Record<string, string> = { ...(token.translations as Record<string, string> || {}) };
          if (translations[data.language]) {
            delete translations[data.language];
            await this.tokenRepository.update(token.id, { translations });
          }
        }
      }
    }

    if (data.userId) {
      await this.activityLogService.create({
        type: ActivityType.PROJECT_IMPORT,
        projectId,
        userId: data.userId,
        details: {
          entityId: projectId,
          entityType: 'project',
          entityName: project.name,
          language: data.language,
          format: data.format,
          mode: data.mode,
          stats,
        },
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      });
    }

    return {
      stats,
      message: `导入完成：${stats.added}个已添加，${stats.updated}个已更新，${stats.unchanged}个未更改`,
    };
  }

  async migrateLanguageCodes(
    projectId: string,
    data: {
      languageMapping: Record<string, string>;
      userId: string;
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    const stats = {
      projectLanguagesUpdated: 0,
      tokensUpdated: 0,
      translationsUpdated: 0,
      historyRecordsUpdated: 0,
    };

    const project = await this.projectRepository.findById(projectId);
    if (!project) throw new NotFoundException('项目不存在');

    const oldLanguages = project.languages || [];
    const newLanguages = [...new Set(oldLanguages.map((l) => data.languageMapping[l] || l))];

    if (JSON.stringify(oldLanguages) !== JSON.stringify(newLanguages)) {
      await this.projectRepository.update(projectId, { languages: newLanguages });
      stats.projectLanguagesUpdated = oldLanguages.length;
    }

    const tokens = await this.tokenRepository.findByProjectId(projectId);
    for (const token of tokens) {
      const oldTranslations = (token.translations as Record<string, string>) || {};
      const newTranslations: Record<string, string> = {};
      let changed = false;

      for (const [oldLang, value] of Object.entries(oldTranslations)) {
        const newLang = data.languageMapping[oldLang] || oldLang;
        if (newLang !== oldLang && newTranslations[newLang]) continue;
        newTranslations[newLang] = value;
        if (newLang !== oldLang) { stats.translationsUpdated++; changed = true; }
      }

      if (changed) {
        await this.tokenRepository.update(token.id, { translations: newTranslations });
        stats.tokensUpdated++;
      }
    }

    await this.activityLogService.create({
      type: ActivityType.PROJECT_UPDATE,
      projectId,
      userId: data.userId,
      details: {
        entityId: projectId,
        entityType: 'project',
        entityName: project.name,
        metadata: { languageMapping: data.languageMapping, oldLanguages, newLanguages, stats },
      },
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });

    return {
      stats,
      message: `迁移完成：项目语言已更新 ${stats.projectLanguagesUpdated} 个，${stats.tokensUpdated} 个令牌已更新，${stats.translationsUpdated} 个翻译键已更新，${stats.historyRecordsUpdated} 个历史记录已更新`,
    };
  }

  private filterTokensByScope(tokens: Token[], scope: string, projectLanguages: string[]): Token[] {
    switch (scope) {
      case 'completed':
        return tokens.filter((t) => {
          const trans = (t.translations as Record<string, string>) || {};
          return projectLanguages.every((l) => trans[l] && trans[l].trim() !== '');
        });
      case 'incomplete':
        return tokens.filter((t) => {
          const trans = (t.translations as Record<string, string>) || {};
          return projectLanguages.some((l) => !trans[l] || trans[l].trim() === '');
        });
      default:
        return tokens;
    }
  }
}
