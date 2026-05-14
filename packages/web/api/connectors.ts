import { apiClient, apiFetch, handleApiResponse } from '../lib/api';

export type EnabledModel = { modelId: string; label?: string; addedManually: boolean };
export type Connector = {
  id: string;
  scope: 'team' | 'project';
  teamId: string;
  projectId: string | null;
  displayName: string;
  provider: string;
  keyHint: string;
  baseUrl: string | null;
  enabledModels: EnabledModel[];
  createdAt: string;
  updatedAt: string;
};

export const listConnectors = async (params: { teamId?: string; projectId?: string }) => {
  const query = new URLSearchParams();
  if (params.teamId) query.set('teamId', params.teamId);
  if (params.projectId) query.set('projectId', params.projectId);
  const qs = query.toString();
  return apiClient.get<Connector[]>(`/api/ai/connectors${qs ? `?${qs}` : ''}`);
};

export const createConnector = async (body: {
  scope: 'team' | 'project'; teamId: string; projectId?: string;
  displayName: string; provider: string; apiKey: string; baseUrl?: string;
  enabledModels: EnabledModel[];
}) => apiClient.post<Connector>('/api/ai/connectors', body);

export const updateConnector = async (
  id: string,
  body: Partial<Pick<Connector, 'displayName' | 'baseUrl' | 'enabledModels'>> & { apiKey?: string },
) => handleApiResponse(await apiFetch<Connector>(`/api/ai/connectors/${id}`, {
  method: 'PATCH',
  body: JSON.stringify(body),
}));

export const deleteConnector = async (id: string) =>
  apiClient.delete(`/api/ai/connectors/${id}`);

export const listModelsForConnector = async (id: string) =>
  apiClient.post<{ models: string[]; source: string }>(`/api/ai/connectors/${id}/list-models`, {});

export const probeModels = async (body: { provider: string; apiKey: string; baseUrl?: string }) =>
  apiClient.post<{ models: string[]; source: string }>('/api/ai/connectors/probe-models', body);

export type ResolvedDefault = {
  configured: boolean;
  connectorId?: string;
  displayName?: string;
  provider?: string;
  model?: string;
  source?: 'project' | 'team';
  toolCalling?: boolean;
  keyHint?: string;
};

export const resolveDefault = async (projectId: string) =>
  apiClient.get<ResolvedDefault>(`/api/ai/defaults/resolve?projectId=${projectId}`);

export const setTeamDefault = async (teamId: string, body: { connectorId: string | null; model: string | null }) =>
  apiClient.put(`/api/ai/defaults/team/${teamId}`, body);

export const setProjectDefault = async (projectId: string, body: { connectorId: string | null; model: string | null }) =>
  apiClient.put(`/api/ai/defaults/project/${projectId}`, body);
