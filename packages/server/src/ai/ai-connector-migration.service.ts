import { Injectable, Logger } from '@nestjs/common';
import { AiConnectorRepository } from '../repository/ai-connector.repository';
import { TeamRepository } from '../repository/team.repository';
import { ProjectRepository } from '../repository/project.repository';
import { PROVIDER_CAPABILITIES } from './providers/capabilities';
import type { ProviderType, AiConfigStored } from './providers/translation-provider.interface';

@Injectable()
export class AiConnectorMigrationService {
  private readonly logger = new Logger(AiConnectorMigrationService.name);

  constructor(
    private readonly connectors: AiConnectorRepository,
    private readonly teams: TeamRepository,
    private readonly projects: ProjectRepository,
  ) {}

  async runOnce(): Promise<{ migratedTeams: number; migratedProjects: number }> {
    let migratedTeams = 0;
    let migratedProjects = 0;

    const legacyTeams = await this.teams.findAllWithLegacyConfig();
    for (const team of legacyTeams) {
      const conn = await this.createMigratedConnector('team', team.id, null, team.aiConfig!);
      await this.teams.update(team.id, {
        defaultConnectorId: conn.id,
        defaultModel: this.resolveModel(team.aiConfig!),
      } as any);
      migratedTeams++;
    }

    const legacyProjects = await this.projects.findAllWithLegacyConfig();
    for (const proj of legacyProjects) {
      const conn = await this.createMigratedConnector('project', proj.teamId, proj.id, proj.aiConfig!);
      await this.projects.update(proj.id, {
        defaultConnectorId: conn.id,
        defaultModel: this.resolveModel(proj.aiConfig!),
      } as any);
      migratedProjects++;
    }

    if (migratedTeams || migratedProjects) {
      this.logger.log(`AI connector migration: ${migratedTeams} team(s), ${migratedProjects} project(s)`);
    }
    return { migratedTeams, migratedProjects };
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
