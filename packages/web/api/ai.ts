import { apiClient } from "../lib/api";

// API Base Path
const API_BASE = '/api/ai';

// Types
export interface TranslateResponse {
  translations: Record<string, string>;
  confidence: Record<string, number>;
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

export interface BatchTranslateEvent {
  type: 'progress' | 'result' | 'error' | 'done';
  tokenId?: string;
  translations?: Record<string, string>;
  confidence?: Record<string, number>;
  completed?: number;
  total?: number;
  failed?: number;
  error?: string;
}

/**
 * Batch translate tokens via SSE
 */
export async function batchTranslateWithAi(
  tokens: Array<{ id: string; text: string; from: string; to: string[] }>,
  projectId: string,
  onEvent: (event: BatchTranslateEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch('/api/ai/batch-translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tokens, projectId }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Batch translate failed: ${response.status}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const event = JSON.parse(line.slice(6)) as BatchTranslateEvent;
          onEvent(event);
        } catch {
          // skip malformed events
        }
      }
    }
  }
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
 * Tone-adjust an existing translation, returning up to 3 candidates.
 */
export type Tone = 'formal' | 'casual' | 'shorter' | 'rephrase' | 'polish' | 'custom';

export async function adjustTone(params: {
  projectId: string;
  currentTranslation: string;
  targetLang: string;
  tone: Tone;
  customInstruction?: string;
}): Promise<{ candidates: string[] }> {
  return apiClient.post<{ candidates: string[] }>(`${API_BASE}/tone-adjust`, params);
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

/**
 * List available models for an AI provider
 */
export async function listAiModels(
  provider: string,
  apiKey: string,
  baseUrl?: string
): Promise<string[]> {
  const res = await apiClient.post<{ models: string[] }>(
    `${API_BASE}/config/models`,
    { provider, apiKey, baseUrl }
  );
  return res.models;
}
