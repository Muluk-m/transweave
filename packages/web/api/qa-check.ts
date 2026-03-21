import { apiClient } from "../lib/api";

export interface QaIssue {
  rule: string;
  severity: 'error' | 'warning';
  message: string;
  language: string;
}

export interface QaResult {
  tokenId: string;
  issues: QaIssue[];
  passed: boolean;
}

export interface QaCheckAllResponse {
  results: QaResult[];
  summary: { total: number; passed: number; failed: number };
}

export async function qaCheckToken(params: {
  tokenId: string;
  sourceText: string;
  sourceLang: string;
  translations: Record<string, string>;
  projectId: string;
}): Promise<QaResult> {
  return apiClient.post<QaResult>('/api/tokens/qa-check', params);
}

export async function qaCheckAll(projectId: string): Promise<QaCheckAllResponse> {
  return apiClient.post<QaCheckAllResponse>('/api/tokens/qa-check-all', { projectId });
}
