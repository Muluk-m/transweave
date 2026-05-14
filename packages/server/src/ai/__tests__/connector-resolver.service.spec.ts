import { ConnectorResolver } from '../connector-resolver.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('ConnectorResolver.resolve', () => {
  const projectId = 'p1';
  const teamId = 't1';
  const teamConn = { id: 'tc', scope: 'team', teamId, projectId: null, provider: 'openai', apiKey: 'enc:k', baseUrl: null, enabledModels: [{ modelId: 'gpt-5.5', addedManually: false }] };
  const projConn = { id: 'pc', scope: 'project', teamId, projectId, provider: 'claude', apiKey: 'enc:k', baseUrl: null, enabledModels: [{ modelId: 'claude-sonnet-4-6', addedManually: false }] };

  function makeResolver(opts: {
    project?: any; team?: any; connectorById?: Record<string, any>;
  }) {
    const projects = { findById: jest.fn().mockResolvedValue(opts.project ?? null) };
    const teams = { findById: jest.fn().mockResolvedValue(opts.team ?? null) };
    const connectors = {
      findById: jest.fn().mockImplementation((id) => Promise.resolve(opts.connectorById?.[id] ?? null)),
    };
    return new ConnectorResolver(connectors as any, projects as any, teams as any);
  }

  it('uses explicit override when provided', async () => {
    const r = makeResolver({
      project: { id: projectId, teamId, defaultConnectorId: null, defaultModel: null },
      team: { id: teamId, defaultConnectorId: null, defaultModel: null },
      connectorById: { tc: teamConn },
    });
    const res = await r.resolve(projectId, { connectorId: 'tc', model: 'gpt-5.5' });
    expect(res.source).toBe('explicit');
    expect(res.connector.id).toBe('tc');
    expect(res.model).toBe('gpt-5.5');
  });

  it('rejects explicit override when connector belongs to a different team', async () => {
    const otherTeamConn = { ...teamConn, teamId: 'other' };
    const r = makeResolver({
      project: { id: projectId, teamId },
      connectorById: { tc: otherTeamConn },
    });
    await expect(r.resolve(projectId, { connectorId: 'tc', model: 'gpt-5.5' })).rejects.toThrow(ForbiddenException);
  });

  it('falls back to project default', async () => {
    const r = makeResolver({
      project: { id: projectId, teamId, defaultConnectorId: 'pc', defaultModel: 'claude-sonnet-4-6' },
      team: { id: teamId, defaultConnectorId: null, defaultModel: null },
      connectorById: { pc: projConn },
    });
    const res = await r.resolve(projectId);
    expect(res.source).toBe('project');
    expect(res.connector.id).toBe('pc');
  });

  it('falls back to team default when project has none', async () => {
    const r = makeResolver({
      project: { id: projectId, teamId, defaultConnectorId: null, defaultModel: null },
      team: { id: teamId, defaultConnectorId: 'tc', defaultModel: 'gpt-5.5' },
      connectorById: { tc: teamConn },
    });
    const res = await r.resolve(projectId);
    expect(res.source).toBe('team');
  });

  it('throws when nothing is configured', async () => {
    const r = makeResolver({
      project: { id: projectId, teamId, defaultConnectorId: null, defaultModel: null },
      team: { id: teamId, defaultConnectorId: null, defaultModel: null },
    });
    await expect(r.resolve(projectId)).rejects.toThrow(/AI_NOT_CONFIGURED/);
  });

  it('throws NotFoundException when project does not exist', async () => {
    const r = makeResolver({});
    await expect(r.resolve(projectId)).rejects.toThrow(NotFoundException);
  });
});
