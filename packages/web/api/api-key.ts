import { apiClient } from '@/lib/api';

const API_BASE = '/api/api-keys';

export interface ApiKeyInfo {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface CreateApiKeyResponse {
  success: boolean;
  apiKey: ApiKeyInfo & { key: string };
}

/**
 * Create a new API key. The full key is only returned in this response.
 */
export async function createApiKey(data: {
  name: string;
  scopes?: string[];
  expiresAt?: string;
}): Promise<CreateApiKeyResponse> {
  return apiClient.post(API_BASE, data);
}

/**
 * List all API keys for the current user.
 */
export async function listApiKeys(): Promise<ApiKeyInfo[]> {
  return apiClient.get(API_BASE);
}

/**
 * Delete/revoke an API key.
 */
export async function deleteApiKey(id: string): Promise<{ success: boolean }> {
  return apiClient.delete(`${API_BASE}/${id}`);
}
