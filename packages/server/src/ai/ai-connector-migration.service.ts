import { Injectable, Logger } from '@nestjs/common';
import { AiConnectorRepository } from '../repository/ai-connector.repository';
import { TeamRepository } from '../repository/team.repository';
import { ProjectRepository } from '../repository/project.repository';
import { PROVIDER_CAPABILITIES } from './providers/capabilities';
import { decryptApiKey } from './encryption.util';
import type { ProviderType, AiConfigStored } from './providers/translation-provider.interface';

@Injectable()
export class AiConnectorMigrationService {
  private readonly logger = new Logger(AiConnectorMigrationService.name);

  constructor(
    private readonly connectors: AiConnectorRepository,
    private readonly teams: TeamRepository,
    private readonly projects: ProjectRepository,
  ) {}

  async runOnce(): Promise<{ migratedTeams: number; migratedProjects: number; skippedTeams: number; skippedProjects: number }> {
    let migratedTeams = 0;
    let migratedProjects = 0;
    let skippedTeams = 0;
    let skippedProjects = 0;

    const legacyTeams = await this.teams.findAllWithLegacyConfig();
    for (const team of legacyTeams) {
      try {
        // Validate that the stored apiKey is still decryptable before migrating
        try {
          decryptApiKey(team.aiConfig!.apiKey);
        } catch {
          this.logger.warn(
            `Skipping migration of team ${team.id}: legacy apiKey is not decryptable (encryption key may have changed). User must re-enter the API key in settings.`,
          );
          skippedTeams++;
          continue;
        }

        const conn = await this.createMigratedConnector('team', team.id, null, team.aiConfig!);
        await this.teams.update(team.id, {
          defaultConnectorId: conn.id,
          defaultModel: this.resolveModel(team.aiConfig!),
        } as any);
        migratedTeams++;
      } catch (e) {
        this.logger.error(
          `Failed to migrate team ${team.id}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    const legacyProjects = await this.projects.findAllWithLegacyConfig();
    for (const proj of legacyProjects) {
      try {
        // Validate that the stored apiKey is still decryptable before migrating
        try {
          decryptApiKey(proj.aiConfig!.apiKey);
        } catch {
          this.logger.warn(
            `Skipping migration of project ${proj.id}: legacy apiKey is not decryptable (encryption key may have changed). User must re-enter the API key in settings.`,
          );
          skippedProjects++;
          continue;
        }

        const conn = await this.createMigratedConnector('project', proj.teamId, proj.id, proj.aiConfig!);
        await this.projects.update(proj.id, {
          defaultConnectorId: conn.id,
          defaultModel: this.resolveModel(proj.aiConfig!),
        } as any);
        migratedProjects++;
      } catch (e) {
        this.logger.error(
          `Failed to migrate project ${proj.id}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    if (migratedTeams || migratedProjects || skippedTeams || skippedProjects) {
      this.logger.log(
        `AI connector migration: ${migratedTeams} team(s), ${migratedProjects} project(s) migrated; ${skippedTeams} team(s), ${skippedProjects} project(s) skipped`,
      );
    }
    return { migratedTeams, migratedProjects, skippedTeams, skippedProjects };
  }

  private resolveModel(legacy: AiConfigStored): string | null {
    if (legacy.model) return legacy.model;
    const cap = PROVIDER_CAPABILITIES[legacy.provider as ProviderType];
    return cap?.defaultModel || null;
  }

  private async createMigratedConnector(
    scope: 'team' | 'project',
    teamId: string,
    projectId: string | null,
    legacy: AiConfigStored,
  ) {
    const model = legacy.model;
    return this.connectors.create({
      scope,
      teamId,
      projectId,
      displayName: 'Default (migrated)',
      provider: legacy.provider,
      apiKey: legacy.apiKey,
      baseUrl: legacy.baseUrl ?? null,
      enabledModels: model ? [{ modelId: model, addedManually: true }] : [],
    } as any);
  }
}
