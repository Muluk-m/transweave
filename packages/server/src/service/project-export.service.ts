import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ProjectRepository } from '../repository/project.repository';
import { TokenRepository } from '../repository/token.repository';
import { ActivityLogService } from './activity-log.service';
import { TranslationMemoryService } from './translation-memory.service';
import { ActivityType } from '../db/schema/activity-logs';
import { type Token } from '../db/schema/tokens';
import { createZipWithLanguageFiles } from 'src/utils/exportTo';
import { parseImportData } from 'src/utils/importFrom';
import type { SupportedImportFormat, SupportedExportFormat } from 'src/utils/formats/types';

@Injectable()
export class ProjectExportService {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly tokenRepository: TokenRepository,
    private readonly activityLogService: ActivityLogService,
    private readonly translationMemoryService: TranslationMemoryService,
  ) {}

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

    // Batch-populate translation memory after import
    if (project.defaultLang && (stats.added > 0 || stats.updated > 0)) {
      const allTokens = await this.tokenRepository.findByProjectId(projectId);
      const tokenData = allTokens.map((t) => ({
        tokenId: t.id,
        translations: t.translations as Record<string, string>,
      }));
      this.translationMemoryService.batchRecordFromTokens(
        tokenData,
        projectId,
        project.defaultLang,
        data.userId,
      ).catch(() => {});
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
