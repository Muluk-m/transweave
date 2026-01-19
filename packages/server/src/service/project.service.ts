import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Project,
  ProjectDocument,
  ProjectModule,
  Token,
  TokenDocument,
  TokenHistory,
  ActivityType,
} from '../models';
import { MembershipService } from './membership.service';
import { createZipWithLanguageFiles } from 'src/utils/exportTo';
import { parseImportData } from 'src/utils/importFrom';
import { MongooseService } from './mongoose.service';
import { diffObject } from 'src/utils/object';
import { ActivityLogService } from './activity-log.service';

@Injectable()
export class ProjectService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(Token.name) private tokenModel: Model<TokenDocument>,
    private membershipService: MembershipService,
    private mongooseService: MongooseService,
    private activityLogService: ActivityLogService,
  ) {}

  async createProject(data: {
    name: string;
    teamId: string;
    url: string;
    description?: string;
    languages?: string[];
    userId: string; // 添加userId用于记录操作者
    ipAddress?: string; // 可选的IP地址
    userAgent?: string; // 可选的User Agent
  }) {
    const session = await this.mongooseService.getConnection().startSession();
    try {
      let result: ProjectDocument | null = null;
      await session.withTransaction(async () => {
        
        const project = new this.projectModel({
          ...data,
          languages: data.languages || [],
        });
        await project.save({ session });
        result = project;

        // 记录操作日志
        await this.activityLogService.create({
          type: ActivityType.PROJECT_CREATE,
          projectId: String(project._id),
          userId: data.userId,
          details: {
            entityId: String(project._id),
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
      });
      return result;
    } finally {
      session.endSession();
    }
  }

  async findAllProjects() {
    return this.projectModel.find().exec();
  }

  async findProjectById(id: string) {
    const project = await this.projectModel
      .findById(id)
      .populate({
        path: 'tokens',
        populate: {
          path: 'history.user',
          select: 'name email id avatar',
        },
      })
      .exec();
    
    // 自动迁移：如果检测到旧格式模块数据，自动清空
    if (project && project.modules && project.modules.length > 0) {
      const hasOldFormat = (project.modules as any).some((m: any) => typeof m === 'string');
      if (hasOldFormat) {
        console.log(`项目 ${project.name} 检测到旧格式模块数据，自动清理...`);
        await this.projectModel.findByIdAndUpdate(id, { $set: { modules: [] } }).exec();
        // 重新获取更新后的数据
        return this.projectModel
          .findById(id)
          .populate({
            path: 'tokens',
            populate: {
              path: 'history.user',
              select: 'name email id avatar',
            },
          })
          .exec();
      }
    }
    
    return project;
  }

  async findProjectsByTeamId(teamId: string) {
    return this.projectModel.find({ teamId }).exec();
  }

  async updateProject(
    id: string,
    data: {
      name?: string;
      description?: string;
      languages?: string[];
      languageLabels?: Record<string, string>; // 自定义语言的中文备注
      modules?: ProjectModule[];
      url?: string;
      userId: string; // 添加userId用于记录操作者
      ipAddress?: string; // 可选的IP地址
      userAgent?: string; // 可选的User Agent
    },
  ) {
    // 先获取原始数据用于比较变更
    const oldProject = await this.projectModel.findById(id).exec();
    if (!oldProject) {
      throw new NotFoundException('项目不存在');
    }

    // 准备更新数据，排除操作记录相关字段
    const { userId, ipAddress, userAgent, ...updateData } = data;

    // 规范化 modules：兼容旧格式（string[]）和新格式（ProjectModule[]）
    if (updateData.modules) {
      // 把 string 转成 { name, code }，并根据 code 去重
      const normalizedModulesMap = new Map<string, ProjectModule>();
      (updateData.modules as any[]).forEach((m: any) => {
        if (typeof m === 'string') {
          const code = m;
          if (!normalizedModulesMap.has(code)) {
            normalizedModulesMap.set(code, { name: code, code });
          }
        } else if (m && typeof m.code === 'string') {
          const code = m.code;
          if (!normalizedModulesMap.has(code)) {
            normalizedModulesMap.set(code, {
              name: m.name || code,
              code,
            });
          }
        }
      });
      updateData.modules = Array.from(normalizedModulesMap.values());
    }

    const updatedProject = await this.projectModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('tokens')
      .exec();

    // 记录变更
    const changes: Array<{field: string; oldValue: any; newValue: any}> = [];
    for (const field of ['name', 'description', 'url']) {
      if (updateData[field] !== undefined && oldProject[field] !== updateData[field]) {
        changes.push({
          field,
          oldValue: oldProject[field],
          newValue: updateData[field],
        });
      }
    }

    // 特殊处理 languageLabels（Map 类型）
    if (updateData.languageLabels !== undefined) {
      const oldLabels = oldProject.languageLabels 
        ? Object.fromEntries(oldProject.languageLabels) 
        : {};
      const newLabels = updateData.languageLabels;
      if (JSON.stringify(oldLabels) !== JSON.stringify(newLabels)) {
        changes.push({
          field: 'languageLabels',
          oldValue: oldLabels,
          newValue: newLabels,
        });
      }
    }

    // 特殊处理languages数组
    if (updateData.languages !== undefined) {
      const oldLangs = JSON.stringify(oldProject.languages || []);
      const newLangs = JSON.stringify(updateData.languages);
      if (oldLangs !== newLangs) {
        changes.push({
          field: 'languages',
          oldValue: oldProject.languages,
          newValue: updateData.languages,
        });
      }
    }

    // 如果有变更，记录操作日志
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
  ) {
    const session = await this.mongooseService.getConnection().startSession();
    try {
      // 先获取项目信息用于日志记录
      const project = await this.projectModel.findById(id).exec();
      if (!project) {
        throw new NotFoundException('项目不存在');
      }

      await session.withTransaction(async () => {
        // 先删除关联的所有tokens
        const deletedTokens = await this.tokenModel
          .deleteMany({ projectId: id })
          .session(session)
          .exec();

        // 再删除项目
        await this.projectModel.findByIdAndDelete(id).session(session).exec();

        // 记录操作日志
        await this.activityLogService.create({
          type: ActivityType.PROJECT_DELETE,
          projectId: id,
          userId,
          details: {
            entityId: id,
            entityType: 'project',
            entityName: project.name,
            metadata: {
              deletedTokensCount: deletedTokens.deletedCount,
              languages: project.languages,
              description: project.description,
            },
          },
          ipAddress,
          userAgent,
        });
      });
      return { success: true };
    } finally {
      session.endSession();
    }
  }

  async addLanguage(
    id: string,
    language: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const project = await this.projectModel.findById(id).exec();

    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    // 确保language数组存在且避免重复添加
    const languages = project.languages || [];
    if (!languages.includes(language)) {
      project.languages = [...languages, language];
      const updatedProject = await project.save();

      // 记录操作日志
      await this.activityLogService.create({
        type: ActivityType.PROJECT_LANGUAGE_ADD,
        projectId: id,
        userId,
        details: {
          entityId: id,
          entityType: 'project',
          entityName: project.name,
          language,
          changes: [{
            field: 'languages',
            oldValue: languages,
            newValue: project.languages,
          }],
        },
        ipAddress,
        userAgent,
      });

      return updatedProject;
    }

    return project;
  }

  async removeLanguage(
    id: string,
    language: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const project = await this.projectModel.findById(id).exec();

    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    const oldLanguages = project.languages || [];
    const newLanguages = oldLanguages.filter((lang) => lang !== language);
    
    // 只有在实际删除了语言时才更新和记录日志
    if (oldLanguages.length !== newLanguages.length) {
      project.languages = newLanguages;
      const updatedProject = await project.save();

      // 记录操作日志
      await this.activityLogService.create({
        type: ActivityType.PROJECT_LANGUAGE_REMOVE,
        projectId: id,
        userId,
        details: {
          entityId: id,
          entityType: 'project',
          entityName: project.name,
          language,
          changes: [{
            field: 'languages',
            oldValue: oldLanguages,
            newValue: newLanguages,
          }],
        },
        ipAddress,
        userAgent,
      });

      return updatedProject;
    }

    return project;
  }

  // Module management
  async addModule(
    id: string,
    module: ProjectModule,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const project = await this.projectModel.findById(id).exec();

    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    if (!module.name || !module.code) {
      throw new BadRequestException('模块名称和代码必须齐全');
    }

    // 验证模块代码格式
    if (!/^[a-z][a-z0-9]*$/i.test(module.code)) {
      throw new BadRequestException('模块名只能包含字母、数字和下划线，且必须以字母开头');
    }

    // 确保modules数组存在且避免重复添加
    const modules = project.modules || [];
    if (modules.some((m) => m.code === module.code)) {
      throw new BadRequestException('该模块代码已存在');
    }

    project.modules = [...modules, module];
    const updatedProject = await project.save();

    // 记录操作日志（可选）
    await this.activityLogService.create({
      type: ActivityType.PROJECT_UPDATE,
      projectId: id,
      userId,
      details: {
        entityId: id,
        entityType: 'project',
        entityName: project.name,
        changes: [
          {
            field: 'modules',
            oldValue: modules,
            newValue: project.modules,
          },
        ],
        metadata: {
          action: 'add_module',
          module,
        },
      },
      ipAddress,
      userAgent,
    });

    return updatedProject;
  }

  async removeModule(
    id: string,
    moduleCode: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const project = await this.projectModel.findById(id).exec();

    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    const oldModules = project.modules || [];
    const newModules = oldModules.filter((m) => m.code !== moduleCode);

    // 只有在实际删除了模块时才更新和记录日志
    if (oldModules.length !== newModules.length) {
      project.modules = newModules;
      const updatedProject = await project.save();

      // 记录操作日志（可选）
      await this.activityLogService.create({
        type: ActivityType.PROJECT_UPDATE,
        projectId: id,
        userId,
        details: {
          entityId: id,
          entityType: 'project',
          entityName: project.name,
          changes: [{
            field: 'modules',
            oldValue: oldModules,
            newValue: newModules,
          }],
          metadata: {
            action: 'remove_module',
            moduleCode,
          },
        },
        ipAddress,
        userAgent,
      });

      return updatedProject;
    }

    return project;
  }

  // Check if user has permission to access the project
  async checkUserProjectPermission(
    projectId: string,
    userId: string,
  ): Promise<boolean> {
    // First get project information to find its team
    const project = await this.projectModel
      .findById(projectId)
      .select('teamId')
      .exec();

    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    // Check if user is a team member
    return this.membershipService.isMember(String(project.teamId), userId);
  }

  // ============= Token related methods =============

  // 获取项目中的所有令牌
  async getProjectTokens(projectId: string) {
    return this.tokenModel
      .find({ projectId })
      .populate({
        path: 'history.user',
        select: 'name email id avatar',
      })
      .exec();
  }

  // 创建新令牌
  async createToken(data: {
    projectId: string;
    key: string;
    module?: string;
    tags?: string[];
    comment?: string;
    translations?: Record<string, string>;
    screenshots?: string[];
    userId: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const session = await this.mongooseService.getConnection().startSession();
    try {
      let result: TokenDocument | null = null;
      await session.withTransaction(async () => {
        // 检查key是否已存在
        const existingToken = await this.tokenModel
          .findOne({
            projectId: data.projectId,
            key: data.key,
          })
          .session(session)
          .exec();

        if (existingToken) {
          throw new BadRequestException(`令牌键'${data.key}'已存在`);
        }

        // 创建令牌并直接存储翻译
        const token = new this.tokenModel({
          projectId: data.projectId,
          key: data.key,
          module: data.module || '',
          tags: data.tags || [],
          comment: data.comment || '',
          translations: data.translations || {},
          screenshots: data.screenshots || [],
          history: [
            {
              user: new Types.ObjectId(data.userId),
              translations: data.translations,
              createdAt: new Date(),
            },
          ],
        });

        await token.save({ session });

        // 将token添加到对应的project中
        await this.projectModel
          .findByIdAndUpdate(
            data.projectId,
            { $push: { tokens: token._id } },
            { session },
          )
          .exec();

        result = await this.tokenModel
          .findById(token._id)
          .populate({
            path: 'history.user',
            select: 'name email id avatar',
          })
          .session(session)
          .exec();

        // 记录操作日志
        await this.activityLogService.create({
          type: ActivityType.TOKEN_CREATE,
          projectId: data.projectId,
          userId: data.userId,
          details: {
            entityId: String(token._id),
            entityType: 'token',
            entityName: token.key,
            metadata: {
              tags: token.tags,
              comment: token.comment,
              translationsCount: Object.keys(data.translations || {}).length,
              languages: Object.keys(data.translations || {}),
            },
          },
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        });
      });
      return result;
    } finally {
      session.endSession();
    }
  }

  // 获取单个令牌
  async getTokenById(tokenId: string) {
    const token = await this.tokenModel
      .findById(tokenId)
      .populate('history.user', 'name email id avatar')
      .exec();

    if (!token) {
      throw new NotFoundException(`令牌 ${tokenId} 不存在`);
    }

    return token;
  }

  // 更新令牌
  async updateToken(
    tokenId: string,
    data: {
      key?: string;
      module?: string;
      tags?: string[];
      comment?: string;
      translations?: Record<string, string>;
      screenshots?: string[];
      userId: string;
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<TokenDocument | null> {
    // 获取令牌以确认它存在
    const token = await this.getTokenById(tokenId);

    // 如果更改键，检查重复
    if (data.key && data.key !== token.key) {
      const existingToken = await this.tokenModel
        .findOne({
          projectId: token.projectId,
          key: data.key,
          _id: { $ne: tokenId },
        })
        .exec();

      if (existingToken) {
        throw new BadRequestException(`令牌键'${data.key}'已存在`);
      }
    }

    // 准备更新数据
    const updateData = {} as TokenDocument;
    if (data.key !== undefined) updateData.key = data.key;
    if (data.module !== undefined) updateData.module = data.module;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.comment !== undefined) updateData.comment = data.comment;
    if (data.screenshots !== undefined) updateData.screenshots = data.screenshots;

    // 如果提供了翻译，合并而不是完全替换
    if (data.translations) {
      // 获取当前令牌的现有翻译
      const currentTranslations = token.translations || {};

      // 合并新翻译
      updateData.translations = {
        ...currentTranslations,
        ...data.translations,
      };

      if (!diffObject(updateData.translations, token.translations)) {
        // 添加历史记录
        updateData.history = [
          ...token.history,
          {
            createdAt: new Date(),
            translations: data.translations,
            user: new Types.ObjectId(data.userId),
          } as unknown as TokenHistory,
        ];
      }
    }

    // 记录变更
    const changes: Array<{field: string; oldValue: any; newValue: any}> = [];
    
    // 检查各字段变更
    if (data.key !== undefined && data.key !== token.key) {
      changes.push({ field: 'key', oldValue: token.key, newValue: data.key });
    }
    if (data.tags !== undefined) {
      const oldTags = JSON.stringify(token.tags || []);
      const newTags = JSON.stringify(data.tags);
      if (oldTags !== newTags) {
        changes.push({ field: 'tags', oldValue: token.tags, newValue: data.tags });
      }
    }
    if (data.comment !== undefined && data.comment !== token.comment) {
      changes.push({ field: 'comment', oldValue: token.comment, newValue: data.comment });
    }
    if (data.translations !== undefined) {
      changes.push({ 
        field: 'translations', 
        oldValue: token.translations,
        newValue: updateData.translations
      });
    }

    // 执行更新
    const updatedToken = await this.tokenModel
      .findByIdAndUpdate(tokenId, updateData, { new: true })
      .populate({
        path: 'history.user',
        select: 'name email id avatar',
      })
      .exec();

    // 如果有变更，记录操作日志
    if (changes.length > 0 && updatedToken) {
      await this.activityLogService.create({
        type: ActivityType.TOKEN_UPDATE,
        projectId: String(token.projectId),
        userId: data.userId,
        details: {
          entityId: tokenId,
          entityType: 'token',
          entityName: updatedToken.key,
          changes,
          metadata: {
            translationsUpdated: data.translations ? Object.keys(data.translations) : undefined,
          },
        },
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      });
    }

    return updatedToken;
  }

  // 批量更新令牌模块
  async batchUpdateTokenModule(
    tokenIds: string[],
    moduleCode: string | null,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<TokenDocument[]> {
    if (!tokenIds || tokenIds.length === 0) {
      throw new BadRequestException('没有要更新的词条');
    }

    const tokens = await this.tokenModel
      .find({ _id: { $in: tokenIds } })
      .exec();

    if (!tokens.length) {
      throw new NotFoundException('要更新的词条不存在');
    }

    const projectIds = Array.from(
      new Set(tokens.map((t) => String(t.projectId))),
    );
    if (projectIds.length > 1) {
      throw new BadRequestException('一次只能更新同一项目下的词条模块');
    }
    const projectId = projectIds[0];

    // 批量更新 module 字段
    await this.tokenModel.updateMany(
      { _id: { $in: tokenIds } },
      { $set: { module: moduleCode ?? '' } },
    );

    const updatedTokens = await this.tokenModel
      .find({ _id: { $in: tokenIds } })
      .populate({
        path: 'history.user',
        select: 'name email id avatar',
      })
      .exec();

    // 记录一条汇总操作日志
    await this.activityLogService.create({
      type: ActivityType.TOKEN_UPDATE,
      projectId,
      userId,
      details: {
        entityId: undefined,
        entityType: 'token',
        entityName: 'batch_update_module',
        changes: [
          {
            field: 'module',
            oldValue: undefined,
            newValue: moduleCode ?? '',
          },
        ],
        metadata: {
          tokenIds,
          moduleCode: moduleCode ?? '',
        },
      },
      ipAddress,
      userAgent,
    });

    return updatedTokens;
  }

  // 删除令牌
  async deleteToken(
    tokenId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // 获取令牌以确认它存在
    const token = await this.getTokenById(tokenId);

    // 删除令牌
    const deletedToken = await this.tokenModel.findByIdAndDelete(tokenId).exec();

    // 记录操作日志
    await this.activityLogService.create({
      type: ActivityType.TOKEN_DELETE,
      projectId: String(token.projectId),
      userId,
      details: {
        entityId: tokenId,
        entityType: 'token',
        entityName: token.key,
        metadata: {
          tags: token.tags,
          comment: token.comment,
          translationsCount: Object.keys(token.translations || {}).length,
        },
      },
      ipAddress,
      userAgent,
    });

    return deletedToken;
  }

  // Export project content
  async exportProjectTokens(
    projectId: string,
    options: {
      format: 'json' | 'csv' | 'xml' | 'yaml';
      scope?: 'all' | 'completed' | 'incomplete' | 'custom';
      languages?: string[];
      showEmptyTranslations?: boolean;
      prettify?: boolean;
      includeMetadata?: boolean;
      asZip?: boolean; // 添加选项：是否作为ZIP包导出
      userId?: string; // 用于记录操作日志
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    // 获取项目信息，主要是支持的语言列表
    const project = await this.projectModel.findById(projectId).exec();

    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    // 获取所有令牌
    let tokens = await this.tokenModel.find({ projectId }).lean().exec();

    // 根据范围筛选令牌
    if (options.scope) {
      tokens = this.filterTokensByScope(
        tokens,
        options.scope,
        project.languages,
      );
    }

    // 如果指定了语言，则仅导出这些语言的翻译
    const targetLanguages =
      options.languages && options.languages.length > 0
        ? options.languages.filter((lang) => project.languages.includes(lang))
        : project.languages;

    // 根据showEmptyTranslations选项过滤
    if (options.showEmptyTranslations === false) {
      tokens = tokens.map((token) => {
        const translations = token.translations || {};
        const filteredTranslations: Record<string, string> = {};

        targetLanguages.forEach((lang) => {
          if (translations[lang]) {
            filteredTranslations[lang] = translations[lang];
          }
        });

        return {
          ...token,
          translations: filteredTranslations,
        };
      });
    } else {
      // 确保所有令牌都包含所有目标语言，即使是空的
      tokens = tokens.map((token) => {
        const translations = token.translations || {};
        const completeTranslations: Record<string, string> = {};

        targetLanguages.forEach((lang) => {
          completeTranslations[lang] = translations[lang] || '';
        });

        return {
          ...token,
          translations: completeTranslations,
        };
      });
    }

    // 移除不需要的元数据
    if (!options.includeMetadata) {
      const formattedTokens = tokens.map(
        ({ _id, projectId, key, translations }) => ({
          id: String(_id),
          projectId,
          key,
          translations,
        }),
      );
      tokens = formattedTokens as typeof tokens;
    }

    // 默认导出为ZIP（每种语言一个文件）
    const result = await createZipWithLanguageFiles(
      tokens,
      {
        ...project.toObject(),
        id: String(project._id),
      },
      targetLanguages,
      options.format,
      {
        prettify: options.prettify,
      },
    );

    // 记录操作日志
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
            tokensCount: tokens.length,
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

  // Import project content
  /**
   * Preview import tokens without actually importing
   * Returns what will be added, updated, or deleted
   */
  async previewImportTokens(
    projectId: string,
    data: {
      language: string; // 要导入的语言
      content: string; // 文件内容
      format: 'json' | 'csv' | 'xml' | 'yaml'; // 导入格式
      mode: 'append' | 'replace'; // 导入模式
    },
  ) {
    // 验证项目存在
    const project = await this.projectModel.findById(projectId).exec();
    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    // 验证语言是否在项目的支持语言列表中
    if (!project.languages.includes(data.language)) {
      throw new BadRequestException(`项目不支持"${data.language}"语言`);
    }

    // 解析导入的数据
    const importData = parseImportData(
      data.content,
      data.format,
      data.language,
    );

    if (!importData || Object.keys(importData).length === 0) {
      throw new BadRequestException('导入的文件不包含有效数据或格式不正确');
    }

    // 获取项目的所有当前令牌
    const existingTokens = await this.tokenModel
      .find({ projectId })
      .lean()
      .exec();

    // 分类变更
    const changes = {
      toAdd: [] as Array<{ key: string; translation: string }>,
      toUpdate: [] as Array<{ 
        key: string; 
        oldTranslation: string; 
        newTranslation: string;
        tags?: string[];
        comment?: string;
      }>,
      toDelete: [] as Array<{ key: string; translation: string }>,
      unchanged: [] as Array<{ key: string; translation: string }>,
      stats: {
        added: 0,
        updated: 0,
        deleted: 0,
        unchanged: 0,
        total: Object.keys(importData).length,
      },
    };

    // 检查每个导入的键
    for (const [key, value] of Object.entries(importData)) {
      const existingToken = existingTokens.find((t) => t.key === key);

      if (!existingToken) {
        // 新增的 token
        changes.toAdd.push({ key, translation: value });
        changes.stats.added++;
      } else {
        // 检查是否需要更新
        const currentValue = existingToken.translations?.[data.language] || '';
        if (currentValue !== value) {
          changes.toUpdate.push({
            key,
            oldTranslation: currentValue,
            newTranslation: value,
            tags: existingToken.tags,
            comment: existingToken.comment,
          });
          changes.stats.updated++;
        } else {
          changes.unchanged.push({ key, translation: value });
          changes.stats.unchanged++;
        }
      }
    }

    // 如果是替换模式，找出将被删除翻译的 tokens
    if (data.mode === 'replace') {
      const importKeySet = new Set(Object.keys(importData));
      for (const token of existingTokens) {
        if (!importKeySet.has(token.key) && token.translations?.[data.language]) {
          changes.toDelete.push({
            key: token.key,
            translation: token.translations[data.language],
          });
          changes.stats.deleted++;
        }
      }
    }

    return changes;
  }

  async importProjectTokens(
    projectId: string,
    data: {
      language: string; // 要导入的语言
      content: string; // 文件内容
      format: 'json' | 'csv' | 'xml' | 'yaml'; // 导入格式
      mode: 'append' | 'replace'; // 导入模式
      userId?: string; // 用于记录操作日志
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    const stats = {
      added: 0, // 添加的新令牌数量
      updated: 0, // 更新的令牌数量
      unchanged: 0, // 未更改的令牌数量
      total: 0, // 处理的令牌总数
    };

    // 先进行数据验证和解析，避免在事务中进行
    const project = await this.projectModel.findById(projectId).exec();
    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    // 验证语言是否在项目的支持语言列表中
    if (!project.languages.includes(data.language)) {
      throw new BadRequestException(`项目不支持"${data.language}"语言`);
    }

    // 解析导入的数据
    const importData = parseImportData(
      data.content,
      data.format,
      data.language,
    );

    if (!importData || Object.keys(importData).length === 0) {
      throw new BadRequestException('导入的文件不包含有效数据或格式不正确');
    }

    // 获取项目的所有当前令牌（在事务外执行）
    const existingTokens = await this.tokenModel
      .find({ projectId })
      .lean()
      .exec();

    // 统计信息
    stats.total = Object.keys(importData).length;

    // 分批处理数据以避免事务过大
    const BATCH_SIZE = 50;
    const importKeys = Object.keys(importData);
    
    for (let i = 0; i < importKeys.length; i += BATCH_SIZE) {
      const batch = importKeys.slice(i, i + BATCH_SIZE);
      const session = await this.mongooseService.getConnection().startSession();
      
      try {
        await session.withTransaction(async () => {
          for (const key of batch) {
            const value = importData[key];
            const existingToken = existingTokens.find((t) => t.key === key);

            if (data.mode === 'replace' && existingToken) {
              // 替换模式：先清除此语言的翻译，然后设置新值
              const translations = { ...(existingToken.translations || {}) };
              translations[data.language] = value;

              await this.tokenModel
                .findByIdAndUpdate(existingToken._id, { translations })
                .session(session)
                .exec();

              stats.updated++;
            } else if (existingToken) {
              // 追加模式或替换模式下的现有令牌
              const translations = { ...(existingToken.translations || {}) };

              // 检查是否需要更新
              if (translations[data.language] !== value) {
                translations[data.language] = value;

                await this.tokenModel
                  .findByIdAndUpdate(existingToken._id, { translations })
                  .session(session)
                  .exec();

                stats.updated++;
              } else {
                stats.unchanged++;
              }
            } else {
              // 创建新令牌
              const translations: Record<string, string> = {};
              translations[data.language] = value;

              const newToken = new this.tokenModel({
                projectId,
                key,
                tags: [],
                comment: '',
                translations,
              });

              await newToken.save({ session });

              // 将新令牌添加到项目中
              await this.projectModel
                .findByIdAndUpdate(
                  projectId,
                  { $push: { tokens: newToken._id } },
                  { session },
                )
                .exec();

              stats.added++;
              // 将新令牌添加到现有令牌列表中，以便后续批次能够找到它
              existingTokens.push({
                _id: newToken._id,
                key,
                translations,
                projectId,
                tags: [],
                comment: '',
              } as any);
            }
          }
        });
      } finally {
        session.endSession();
      }
    }

    // 如果是替换模式，需要单独处理清除其他令牌的此语言翻译
    if (data.mode === 'replace') {
      const session = await this.mongooseService.getConnection().startSession();
      try {
        await session.withTransaction(async () => {
          // 找出不在导入数据中但存在于项目中的令牌，清除它们的此语言翻译
          const importKeySet = new Set(Object.keys(importData));
          const tokensToUpdate = existingTokens.filter(
            (token) => !importKeySet.has(token.key) && token.translations?.[data.language]
          );

                     for (const token of tokensToUpdate) {
             const translations = { ...(token.translations || {}) };
             delete translations[data.language];

             await this.tokenModel
               .findByIdAndUpdate(token._id, { translations })
               .session(session)
               .exec();
           }
        });
      } finally {
        session.endSession();
      }
    }

    // 记录操作日志
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

  // Migrate language codes in project and all tokens
  async migrateLanguageCodes(
    projectId: string,
    data: {
      languageMapping: Record<string, string>; // e.g., {"阿尔巴尼亚语": "sq", "阿塞拜疆语": "az"}
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

    // Get project
    const project = await this.projectModel.findById(projectId).exec();
    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    // Step 1: Update project languages array (before transaction)
    const oldLanguages = project.languages || [];
    const newLanguages = oldLanguages.map(
      (lang) => data.languageMapping[lang] || lang,
    );

    // Remove duplicates
    const uniqueNewLanguages = [...new Set(newLanguages)];

    // Step 2: Get all tokens before transaction to avoid cursor issues
    const tokens = await this.tokenModel
      .find({ projectId })
      .exec();

    // Step 3: Process updates in transaction
    const session = await this.mongooseService.getConnection().startSession();
    try {
      await session.withTransaction(async () => {
        // Update project languages
        if (JSON.stringify(oldLanguages) !== JSON.stringify(uniqueNewLanguages)) {
          await this.projectModel
            .findByIdAndUpdate(
              projectId,
              { languages: uniqueNewLanguages },
              { session }
            )
            .exec();
          stats.projectLanguagesUpdated = oldLanguages.length;
        }

        // Process tokens in batches to avoid transaction timeout
        const BATCH_SIZE = 50;
        for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
          const batch = tokens.slice(i, i + BATCH_SIZE);

          for (const token of batch) {
            let tokenUpdated = false;
            const oldTranslations = token.translations || {};
            const newTranslations: Record<string, string> = {};

            // Migrate translation keys
            for (const [oldLang, value] of Object.entries(oldTranslations)) {
              const newLang = data.languageMapping[oldLang] || oldLang;

              // If the new language code already exists and is different from current key
              if (newLang !== oldLang && newTranslations[newLang]) {
                // Keep the existing translation, don't overwrite
                continue;
              }

              newTranslations[newLang] = value;

              if (newLang !== oldLang) {
                stats.translationsUpdated++;
              }
            }

            // Update token translations if changed
            if (JSON.stringify(oldTranslations) !== JSON.stringify(newTranslations)) {
              tokenUpdated = true;
            }

            // Update history records
            let updatedHistory = token.history;
            if (token.history && token.history.length > 0) {
              updatedHistory = token.history.map((historyItem) => {
                const oldHistoryTranslations = historyItem.translations || {};
                const newHistoryTranslations: Record<string, any> = {};

                for (const [oldLang, value] of Object.entries(oldHistoryTranslations)) {
                  const newLang = data.languageMapping[oldLang] || oldLang;

                  if (newLang !== oldLang && newHistoryTranslations[newLang]) {
                    continue;
                  }

                  newHistoryTranslations[newLang] = value;

                  if (newLang !== oldLang) {
                    stats.historyRecordsUpdated++;
                    tokenUpdated = true;
                  }
                }

                return {
                  ...historyItem,
                  translations: newHistoryTranslations,
                };
              });
            }

            // Bulk update token if any changes
            if (tokenUpdated) {
              await this.tokenModel
                .findByIdAndUpdate(
                  token._id,
                  {
                    translations: newTranslations,
                    history: updatedHistory,
                  },
                  { session }
                )
                .exec();
              stats.tokensUpdated++;
            }
          }
        }
      });

      // Record activity log (after transaction completes)
      await this.activityLogService.create({
        type: ActivityType.PROJECT_UPDATE,
        projectId,
        userId: data.userId,
        details: {
          entityId: projectId,
          entityType: 'project',
          entityName: project.name,
          metadata: {
            languageMapping: data.languageMapping,
            oldLanguages,
            newLanguages: uniqueNewLanguages,
            stats,
          },
        },
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      });
    } finally {
      session.endSession();
    }

    return {
      stats,
      message: `迁移完成：项目语言已更新 ${stats.projectLanguagesUpdated} 个，${stats.tokensUpdated} 个令牌已更新，${stats.translationsUpdated} 个翻译键已更新，${stats.historyRecordsUpdated} 个历史记录已更新`,
    };
  }

  // Filter tokens by scope
  private filterTokensByScope(
    tokens: any[],
    scope: string,
    projectLanguages: string[],
  ) {
    switch (scope) {
      case 'all':
        return tokens;
      case 'completed':
        return tokens.filter((token) => {
          const translations = token.translations || {};
          return projectLanguages.every(
            (lang) => translations[lang] && translations[lang].trim() !== '',
          );
        });
      case 'incomplete':
        return tokens.filter((token) => {
          const translations = token.translations || {};
          return projectLanguages.some(
            (lang) => !translations[lang] || translations[lang].trim() === '',
          );
        });
      case 'custom':
        // 自定义过滤器可以根据需要扩展
        return tokens;
      default:
        return tokens;
    }
  }
}
