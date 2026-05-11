import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ProjectRepository } from '../repository/project.repository';
import { TeamRepository } from '../repository/team.repository';
import { AiConnectorRepository } from '../repository/ai-connector.repository';
import type { AiConnector } from '../db/schema';

export interface ResolvedConnector {
  connector: AiConnector;
  model: string;
  source: 'explicit' | 'project' | 'team';
}

@Injectable()
export class ConnectorResolver {
  constructor(
    private readonly connectors: AiConnectorRepository,
    private readonly projects: ProjectRepository,
    private readonly teams: TeamRepository,
  ) {}

  async resolve(
    projectId: string,
    override?: { connectorId?: string; model?: string },
  ): Promise<ResolvedConnector> {
    const project = await this.projects.findById(projectId);
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    if (override?.connectorId) {
      const c = await this.connectors.findById(override.connectorId);
      if (!c) throw new NotFoundException(`Connector ${override.connectorId} not found`);
      if (c.teamId !== project.teamId) {
        throw new ForbiddenException('Connector does not belong to this project\'s team');
      }
      const model = override.model ?? c.enabledModels[0]?.modelId;
      if (!model) throw new Error('AI_NOT_CONFIGURED: no model specified and connector has no enabledModels');
      return { connector: c, model, source: 'explicit' };
    }

    if (project.defaultConnectorId && project.defaultModel) {
      const c = await this.connectors.findById(project.defaultConnectorId);
      if (c) return { connector: c, model: project.defaultModel, source: 'project' };
    }

    const team = await this.teams.findById(project.teamId);
    if (team?.defaultConnectorId && team?.defaultModel) {
      const c = await this.connectors.findById(team.defaultConnectorId);
      if (c) return { connector: c, model: team.defaultModel, source: 'team' };
    }

    throw new Error('AI_NOT_CONFIGURED: no connector configured at project or team level');
  }

  listForProject(projectId: string) {
    return this.connectors.listForProject(projectId);
  }
  listForTeam(teamId: string) {
    return this.connectors.listForTeam(teamId);
  }
}
