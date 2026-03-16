import { Injectable, NotFoundException } from '@nestjs/common';
import { TokenRepository } from '../repository/token.repository';
import { TokenHistoryRepository } from '../repository/token-history.repository';
import { ProjectRepository } from '../repository/project.repository';
import { ActivityLogService } from './activity-log.service';
import { ActivityType } from '../db/schema';

@Injectable()
export class TokenHistoryService {
  constructor(
    private readonly tokenRepository: TokenRepository,
    private readonly tokenHistoryRepository: TokenHistoryRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly activityLogService: ActivityLogService,
  ) {}

  /**
   * Record a history entry if versioning is enabled for the project.
   */
  async maybeRecordHistory(
    projectId: string,
    tokenId: string,
    userId: string,
    translations: Record<string, any>,
  ): Promise<void> {
    const project = await this.projectRepository.findById(projectId);
    if (project?.enableVersioning) {
      await this.tokenHistoryRepository.create({
        tokenId,
        userId,
        translations,
      });
    }
  }

  /**
   * Restore a token's translations to a specific historical version.
   */
  async restore(tokenId: string, historyId: string, userId: string) {
    const [token, historyRecord] = await Promise.all([
      this.tokenRepository.findById(tokenId),
      this.tokenHistoryRepository.findById(historyId),
    ]);

    if (!token) {
      throw new NotFoundException(`Token ${tokenId} not found`);
    }
    if (!historyRecord || historyRecord.tokenId !== tokenId) {
      throw new NotFoundException(
        `History record ${historyId} not found for token ${tokenId}`,
      );
    }

    const restoredTranslations =
      (historyRecord.translations as Record<string, string>) || {};

    await Promise.all([
      this.maybeRecordHistory(
        token.projectId,
        tokenId,
        userId,
        restoredTranslations,
      ),
      this.tokenRepository.update(tokenId, {
        translations: restoredTranslations,
      } as any),
      this.activityLogService.create({
        type: ActivityType.TOKEN_UPDATE,
        projectId: token.projectId,
        userId,
        details: {
          entityId: tokenId,
          entityType: 'token',
          entityName: token.key,
          changes: [
            {
              field: 'translations',
              oldValue: token.translations,
              newValue: restoredTranslations,
            },
          ],
          metadata: { operation: 'restore', historyId },
        },
      }),
    ]);

    // Return token with populated history
    const updatedToken = await this.tokenRepository.findById(tokenId);
    if (!updatedToken) throw new NotFoundException(`Token ${tokenId} not found`);

    const historyRows =
      await this.tokenHistoryRepository.findByTokenIdWithUser(tokenId);

    return {
      ...updatedToken,
      history: historyRows.map((row) => ({
        ...row.history,
        user: row.user,
      })),
    };
  }
}
