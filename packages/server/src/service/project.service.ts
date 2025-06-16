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
  Token,
  TokenDocument,
  TokenHistory,
} from '../models';
import { MembershipService } from './membership.service';
import { createZipWithLanguageFiles } from 'src/utils/exportTo';
import { parseImportData } from 'src/utils/importFrom';
import { MongooseService } from './mongoose.service';
import { diffObject } from 'src/utils/object';

@Injectable()
export class ProjectService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(Token.name) private tokenModel: Model<TokenDocument>,
    private membershipService: MembershipService,
    private mongooseService: MongooseService,
  ) {}

  async createProject(data: {
    name: string;
    teamId: string;
    url: string;
    description?: string;
    languages?: string[];
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

  async findProjectsByTeamId(teamId: string) {
    return this.projectModel.find({ teamId }).exec();
  }

  async updateProject(
    id: string,
    data: {
      name?: string;
      description?: string;
      languages?: string[];
      url?: string;
    },
  ) {
    return this.projectModel
      .findByIdAndUpdate(id, data, { new: true })
      .populate('tokens')
      .exec();
  }

  async deleteProject(id: string) {
    const session = await this.mongooseService.getConnection().startSession();
    try {
      await session.withTransaction(async () => {
        // 先删除关联的所有tokens
        await this.tokenModel
          .deleteMany({ projectId: id })
          .session(session)
          .exec();

        // 再删除项目
        await this.projectModel.findByIdAndDelete(id).session(session).exec();
      });
      return { success: true };
    } finally {
      session.endSession();
    }
  }

  async addLanguage(id: string, language: string) {
    const project = await this.projectModel.findById(id).exec();

    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    // 确保language数组存在且避免重复添加
    const languages = project.languages || [];
    if (!languages.includes(language)) {
      project.languages = [...languages, language];
      return project.save();
    }

    return project;
  }

  async removeLanguage(id: string, language: string) {
    const project = await this.projectModel.findById(id).exec();

    if (!project) {
      throw new NotFoundException('项目不存在');
    }

    const languages = project.languages || [];
    project.languages = languages.filter((lang) => lang !== language);
    return project.save();
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
    tags?: string[];
    comment?: string;
    translations?: Record<string, string>;
    userId: string;
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
          tags: data.tags || [],
          comment: data.comment || '',
          translations: data.translations || {},
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
      tags?: string[];
      comment?: string;
      translations?: Record<string, string>;
      userId: string;
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
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.comment !== undefined) updateData.comment = data.comment;

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

    // 执行更新
    return this.tokenModel
      .findByIdAndUpdate(tokenId, updateData, { new: true })
      .populate({
        path: 'history.user',
        select: 'name email id avatar',
      })
      .exec();
  }

  // 删除令牌
  async deleteToken(tokenId: string) {
    // 获取令牌以确认它存在
    await this.getTokenById(tokenId);

    // 删除令牌
    return this.tokenModel.findByIdAndDelete(tokenId).exec();
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
    return await createZipWithLanguageFiles(
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
  }

  // Import project content
  async importProjectTokens(
    projectId: string,
    data: {
      language: string; // 要导入的语言
      content: string; // 文件内容
      format: 'json' | 'csv' | 'xml' | 'yaml'; // 导入格式
      mode: 'append' | 'replace'; // 导入模式
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

    return {
      stats,
      message: `导入完成：${stats.added}个已添加，${stats.updated}个已更新，${stats.unchanged}个未更改`,
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
