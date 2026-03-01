import { apiClient } from "../lib/api";

// API Base Path
const API_BASE = '/api/ai';

// Types
export interface TranslateResponse {
  [key: string]: string;
}

export interface AiConfigResponse {
  provider: string;
  keyHint: string;
  model?: string;
  baseUrl?: string;
}

export interface AiConfigStatus {
  configured: boolean;
  provider?: string;
  level?: 'project' | 'team';
  keyHint?: string;
}

/**
 * AI translate
 */
export async function translateWithAi(
  text: string,
  from: string,
  to: string[],
  projectId: string
): Promise<TranslateResponse> {
  return apiClient.post<TranslateResponse>(`${API_BASE}/translate`, {
    text,
    from,
    to,
    projectId,
  });
}

/**
 * Generate multilingual key with AI
 */
export async function generateTokenKeyWithAi(
  remark: string,
  projectId: string,
  tag?: string,
  module?: string
) {
  return apiClient.post<{ data: string }>(`${API_BASE}/generate/key`, {
    remark,
    tag,
    module,
    projectId,
  });
}

/**
 * Get AI configuration status for a project (resolves fallback chain)
 */
export async function getAiConfigStatus(
  projectId: string
): Promise<AiConfigStatus> {
  return apiClient.get<AiConfigStatus>(
    `${API_BASE}/config/status?projectId=${projectId}`
  );
}

/**
 * Get AI configuration for a specific scope (team or project)
 */
export async function getAiConfig(
  scope: 'team' | 'project',
  id: string
): Promise<AiConfigResponse | null> {
  return apiClient.get<AiConfigResponse | null>(
    `${API_BASE}/config/${scope}/${id}`
  );
}

/**
 * Set AI configuration for a specific scope (team or project)
 */
export async function setAiConfig(
  scope: 'team' | 'project',
  id: string,
  config: {
    provider: string;
    apiKey: string;
    model?: string;
    baseUrl?: string;
  }
): Promise<void> {
  await apiClient.put(`${API_BASE}/config/${scope}/${id}`, config);
}

/**
 * Remove AI configuration for a specific scope (team or project)
 */
export async function removeAiConfig(
  scope: 'team' | 'project',
  id: string
): Promise<void> {
  await apiClient.delete(`${API_BASE}/config/${scope}/${id}`);
}
