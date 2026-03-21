import { apiClient } from "@/lib/api";

export interface GlossaryEntry {
  id: string;
  teamId?: string;
  projectId?: string;
  sourceTerm: string;
  translations: Record<string, string>;
  description?: string;
  caseSensitive: boolean;
  doNotTranslate: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export function listGlossary(params: {
  teamId?: string;
  projectId?: string;
  q?: string;
  page?: number;
  perPage?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params.teamId) searchParams.set("teamId", params.teamId);
  if (params.projectId) searchParams.set("projectId", params.projectId);
  if (params.q) searchParams.set("q", params.q);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.perPage) searchParams.set("perPage", String(params.perPage));
  return apiClient.get<{ entries: GlossaryEntry[]; total: number }>(
    `/api/glossary?${searchParams.toString()}`
  );
}

export function createGlossary(data: {
  teamId?: string;
  projectId?: string;
  sourceTerm: string;
  translations: Record<string, string>;
  description?: string;
  caseSensitive?: boolean;
  doNotTranslate?: boolean;
}) {
  return apiClient.post<GlossaryEntry>("/api/glossary", data);
}

export function updateGlossary(
  id: string,
  data: {
    sourceTerm?: string;
    translations?: Record<string, string>;
    description?: string;
    caseSensitive?: boolean;
    doNotTranslate?: boolean;
  }
) {
  return apiClient.put<GlossaryEntry>(`/api/glossary/${id}`, data);
}

export function deleteGlossary(id: string) {
  return apiClient.delete(`/api/glossary/${id}`);
}

export function resolveGlossary(projectId: string, teamId: string) {
  return apiClient.get<
    Array<{
      sourceTerm: string;
      translations: Record<string, string>;
      description?: string;
      caseSensitive: boolean;
      doNotTranslate: boolean;
    }>
  >(`/api/glossary/resolve/${projectId}?teamId=${teamId}`);
}

export function exportGlossary(params: {
  teamId?: string;
  projectId?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params.teamId) searchParams.set("teamId", params.teamId);
  if (params.projectId) searchParams.set("projectId", params.projectId);
  return apiClient.get<GlossaryEntry[]>(
    `/api/glossary/export?${searchParams.toString()}`
  );
}

export function importGlossary(data: {
  teamId?: string;
  projectId?: string;
  entries: Array<{
    sourceTerm: string;
    translations: Record<string, string>;
    description?: string;
    caseSensitive?: boolean;
    doNotTranslate?: boolean;
  }>;
}) {
  return apiClient.post<{ created: number; updated: number }>(
    "/api/glossary/import",
    data
  );
}
