import type { ProviderType } from './translation-provider.interface';

export interface ProviderCapability {
  toolCalling: boolean;
  listModels: boolean;
  requiresBaseUrl: boolean;
  recommendedModels: string[];
  defaultModel: string;
}

// Current model snapshot (2026-05). Re-check this table on every release
// against vendor docs (also mirrored in /Users/qiqian/openclaw/docs/providers).
export const PROVIDER_CAPABILITIES: Record<ProviderType, ProviderCapability> = {
  openai: {
    toolCalling: true,
    listModels: true,
    requiresBaseUrl: false,
    recommendedModels: ['gpt-5.5', 'gpt-5.5-pro', 'gpt-5.5-thinking', 'gpt-5.5-instant'],
    defaultModel: 'gpt-5.5',
  },
  claude: {
    toolCalling: true,
    listModels: false,
    requiresBaseUrl: false,
    recommendedModels: ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
    defaultModel: 'claude-sonnet-4-6',
  },
  gemini: {
    toolCalling: true,
    listModels: true,
    requiresBaseUrl: false,
    recommendedModels: ['gemini-3-flash', 'gemini-3.1-pro', 'gemini-3.1-flash-lite'],
    defaultModel: 'gemini-3-flash',
  },
  deepseek: {
    toolCalling: true,
    listModels: true,
    requiresBaseUrl: false,
    recommendedModels: ['deepseek-v4-flash', 'deepseek-v4-pro'],
    defaultModel: 'deepseek-v4-flash',
  },
  'openai-compatible': {
    toolCalling: true,
    listModels: true,
    requiresBaseUrl: true,
    recommendedModels: [],
    defaultModel: '',
  },
  deepl: {
    toolCalling: false,
    listModels: false,
    requiresBaseUrl: false,
    recommendedModels: [],
    defaultModel: '',
  },
  'google-translate': {
    toolCalling: false,
    listModels: false,
    requiresBaseUrl: false,
    recommendedModels: [],
    defaultModel: '',
  },
};
