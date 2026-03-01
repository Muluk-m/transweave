import { Team, Project, Token, ActivityLog } from "@/jotai/types";
import { apiClient } from "../lib/api";

// API Base Path
const API_BASE = '/api/project';
const TOKEN_API_BASE = '/api/tokens';

// Get team project list
export async function getTeamProjects(teamId: string): Promise<Project[]> {
  return apiClient.get(`${API_BASE}/team/${teamId}`);
}

// Create new project
export async function createProject(data: {
  name: string;
  teamId: string;
  description?: string;
  languages?: string[];
}): Promise<Project> {
  // Auto-generate URL (can use pinyin or English conversion of project name)
  const url = data.name.toLowerCase().replace(/\s+/g, '-');

  return apiClient.post(`${API_BASE}/create`, {
    ...data,
    url
  });
}

// Get project details
export async function getProject(id: string): Promise<Project> {
  return apiClient.get(`${API_BASE}/find/${id}`);
}

// Update project
export async function updateProject(id: string, data: {
  name?: string;
  description?: string;
  languages?: string[];
  languageLabels?: Record<string, string>; // 自定义语言的中文备注
  modules?: Array<{ name: string; code: string }>;
  url?: string;
}): Promise<Project> {
  return apiClient.put(`${API_BASE}/update/${id}`, data);
}

// Delete project
export async function deleteProject(id: string): Promise<void> {
  return apiClient.delete(`${API_BASE}/delete/${id}`);
}

// Add project language
export async function addProjectLanguage(id: string, language: string): Promise<Project> {
  return apiClient.post(`${API_BASE}/language/${id}`, { language });
}

// Remove project language
export async function removeProjectLanguage(id: string, language: string): Promise<Project> {
  return apiClient.delete(`${API_BASE}/language/${id}/${language}`);
}

// Check user's permission for the project
export async function checkProjectPermission(projectId: string): Promise<boolean> {
  return apiClient.get(`${API_BASE}/check/${projectId}`);
}

// ============= Token Related API =============

// Get all tokens of a project
export async function getProjectTokens(projectId: string): Promise<Token[]> {
  return apiClient.get(`${TOKEN_API_BASE}/${projectId}`);
}

// Search tokens with server-side filtering
export async function searchTokens(projectId: string, options?: {
  query?: string;
  module?: string;
  status?: 'all' | 'completed' | 'incomplete';
  language?: string;
  tags?: string;
  page?: number;
  perPage?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<{
  tokens: Token[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}> {
  const params = new URLSearchParams();
  if (options?.query) params.append('q', options.query);
  if (options?.module) params.append('module', options.module);
  if (options?.status && options.status !== 'all') params.append('status', options.status);
  if (options?.language) params.append('language', options.language);
  if (options?.tags) params.append('tags', options.tags);
  if (options?.page) params.append('page', options.page.toString());
  if (options?.perPage) params.append('perPage', options.perPage.toString());
  if (options?.sortBy) params.append('sortBy', options.sortBy);
  if (options?.sortOrder) params.append('sortOrder', options.sortOrder);
  const qs = params.toString();
  return apiClient.get(`${TOKEN_API_BASE}/${projectId}/search${qs ? `?${qs}` : ''}`);
}

// Get per-language completion progress
export async function getTokenProgress(projectId: string): Promise<Array<{
  language: string;
  total: number;
  completed: number;
  percentage: number;
}>> {
  return apiClient.get(`${TOKEN_API_BASE}/${projectId}/progress`);
}

// Create new token
export async function createToken(projectId: string, data: {
  key: string;
  module?: string;
  tags?: string[];
  comment?: string;
  translations?: Record<string, string>;
  screenshots?: string[];
}): Promise<Token> {
  return apiClient.post(TOKEN_API_BASE, {
    projectId,
    ...data
  });
}

// Get single token details
export async function getToken(tokenId: string): Promise<Token> {
  return apiClient.get(`${TOKEN_API_BASE}/detail/${tokenId}`);
}

// Update token
export async function updateToken(tokenId: string, data: {
  key?: string;
  module?: string;
  tags?: string[];
  comment?: string;
  screenshots?: string[];
  translations?: Record<string, string>;
}): Promise<Token> {
  return apiClient.put(`${TOKEN_API_BASE}/${tokenId}`, data);
}

// Delete token
export async function deleteToken(tokenId: string): Promise<void> {
  return apiClient.delete(`${TOKEN_API_BASE}/${tokenId}`);
}

// Bulk operation (delete, set-tags, set-module)
export async function bulkTokenOperation(
  tokenIds: string[],
  operation: 'delete' | 'set-tags' | 'set-module',
  payload?: { tags?: string[]; module?: string | null },
): Promise<any> {
  return apiClient.post(`${TOKEN_API_BASE}/bulk`, { tokenIds, operation, payload });
}

// Convenience wrapper for batch module update
export async function batchUpdateTokenModule(
  tokenIds: string[],
  moduleCode: string | null,
): Promise<Token[]> {
  return bulkTokenOperation(tokenIds, 'set-module', { module: moduleCode });
}

// Module management
export async function addModule(projectId: string, module: string): Promise<Project> {
  return apiClient.post(`${API_BASE}/module/${projectId}`, { module });
}

export async function removeModule(projectId: string, module: string): Promise<Project> {
  return apiClient.delete(`${API_BASE}/module/${projectId}/${module}`);
}

// Export project copy
export async function exportProjectTokens(projectId: string, options: {
  format: 'json' | 'csv' | 'xml' | 'yaml' | 'xliff' | 'po';
  scope?: 'all' | 'completed' | 'incomplete' | 'custom';
  languages?: string[];
  showEmptyTranslations?: boolean;
  prettify?: boolean;
  includeMetadata?: boolean;
}) {
  // Use blob response type to handle file download
  return apiClient.post(
    `${API_BASE}/export/${projectId}`,
    options,
    { responseType: 'blob' }
  );
}

// Preview import before actually importing
export async function previewImportTokens(projectId: string, data: {
  language: string;
  content: string;
  format: 'json' | 'csv' | 'xml' | 'yaml' | 'xliff' | 'po';
  mode: 'append' | 'replace';
}): Promise<{
  success: boolean;
  changes: {
    toAdd: Array<{ key: string; translation: string }>;
    toUpdate: Array<{ 
      key: string; 
      oldTranslation: string; 
      newTranslation: string;
      tags?: string[];
      comment?: string;
    }>;
    toDelete: Array<{ key: string; translation: string }>;
    unchanged: Array<{ key: string; translation: string }>;
    stats: {
      added: number;
      updated: number;
      deleted: number;
      unchanged: number;
      total: number;
    };
  };
}> {
  return apiClient.post(`${API_BASE}/import/preview/${projectId}`, data);
}

// Import project copy
export async function importProjectTokens(projectId: string, data: {
  language: string;
  content: string;
  format: 'json' | 'csv' | 'xml' | 'yaml' | 'xliff' | 'po';
  mode: 'append' | 'replace';
}): Promise<{
  success: boolean;
  message: string;
  stats: {
    added: number;        // Number of added tokens
    updated: number;      // Number of updated tokens
    unchanged: number;    // Number of unchanged tokens
    total: number;        // Total processed tokens
  }
}> {
  return apiClient.post(`${API_BASE}/import/${projectId}`, data);
}

// Get project recent activities
export async function getProjectRecentActivities(projectId: string, limit?: number): Promise<ActivityLog[]> {
  const params = new URLSearchParams();
  if (limit) {
    params.append('limit', limit.toString());
  }
  return apiClient.get(`/api/activity-logs/project/${projectId}/recent?${params.toString()}`);
}

// Query project activities with filters
export async function queryProjectActivities(params: {
  projectId: string;
  userId?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): Promise<{
  data: ActivityLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, value.toString());
    }
  });
  return apiClient.get(`/api/activity-logs?${queryParams.toString()}`);
}
