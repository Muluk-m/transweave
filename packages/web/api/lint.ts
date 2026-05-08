import { apiClient } from '../lib/api';

export type LintRule =
  | 'placeholder-mismatch'
  | 'html-tag-mismatch'
  | 'length-overflow';

export type LintSeverity = 'error' | 'warning';

export interface LintIssue {
  rule: LintRule;
  severity: LintSeverity;
  language: string;
  message: string;
  details?: Record<string, unknown>;
}

export async function lintTranslation(params: {
  sourceText: string;
  targetText: string;
  language: string;
  maxLength?: number;
}): Promise<{ issues: LintIssue[] }> {
  return apiClient.post<{ issues: LintIssue[] }>('/api/lint/translation', params);
}
