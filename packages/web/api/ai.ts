import { apiClient } from "../lib/api";

// API Base Path
const API_BASE = '/api/ai';

// User type definition
export interface TranslateResponse {
  [key: string]: string;
}

/**
 * Ai translate
 */
export async function translateWithAi(text: string, from: string, to: string[]): Promise<TranslateResponse> {
  return apiClient.post<TranslateResponse>(`${API_BASE}/translate`, {
    text,
    from,
    to,
  });
}

