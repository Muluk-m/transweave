import { apiClient } from "@/lib/api";

export interface TmSuggestion {
  sourceText: string;
  targetText: string;
  similarity: number;
  crossProject?: boolean;
  projectName?: string;
}

export function getTmSuggestions(params: {
  projectId: string;
  sourceText: string;
  sourceLang: string;
  targetLang: string;
}) {
  const searchParams = new URLSearchParams({
    projectId: params.projectId,
    sourceText: params.sourceText,
    sourceLang: params.sourceLang,
    targetLang: params.targetLang,
  });
  return apiClient.get<TmSuggestion[]>(
    `/api/tm/suggestions?${searchParams.toString()}`
  );
}
