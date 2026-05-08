export const SUPPORTED_PROVIDERS = [
  'openai',
  'claude',
  'deepseek',
  'gemini',
  'deepl',
  'google-translate',
] as const;

export type ProviderType = (typeof SUPPORTED_PROVIDERS)[number];

export const LLM_PROVIDERS = ['openai', 'claude', 'deepseek', 'gemini'] as const satisfies readonly ProviderType[];
export type LLMProviderType = (typeof LLM_PROVIDERS)[number];

export interface TranslationContext {
  glossaryTerms?: Array<{
    sourceTerm: string;
    translations: Record<string, string>;
    doNotTranslate?: boolean;
  }>;
  tmMatches?: Array<{
    sourceText: string;
    targetText: string;
    targetLanguage: string;
    similarity: number;
  }>;
}

export interface TranslationResult {
  translations: Record<string, string>;
  confidence: Record<string, number>;
}

export interface TranslationProvider {
  readonly name: string;

  translate(params: {
    text: string;
    from: string;
    to: string[];
    context?: TranslationContext;
    /**
     * Override the provider's internal prompt with a fully-rendered string.
     * When set, providers using LLM chat completions SHALL send this as the
     * user message. `context` is ignored under override (caller embeds it).
     */
    promptOverride?: string;
  }): Promise<TranslationResult>;

  validateApiKey(): Promise<boolean>;

  listModels?(): Promise<string[]>;
}

/** Config with decrypted API key, used at runtime */
export interface ProviderConfig {
  provider: ProviderType;
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

/** Input from the user (API request body) */
export interface AiConfigDto {
  provider: ProviderType;
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

/** Stored in the database (apiKey is encrypted ciphertext) */
export interface AiConfigStored {
  provider: ProviderType;
  apiKey: string;
  model?: string;
  baseUrl?: string;
}
