export const SUPPORTED_PROVIDERS = [
  'openai',
  'claude',
  'deepl',
  'google-translate',
] as const;

export type ProviderType = (typeof SUPPORTED_PROVIDERS)[number];

export interface TranslationProvider {
  readonly name: string;

  translate(params: {
    text: string;
    from: string;
    to: string[];
  }): Promise<Record<string, string>>;

  validateApiKey(): Promise<boolean>;
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
