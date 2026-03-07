import type {
  TranslationProvider,
  ProviderConfig,
} from './translation-provider.interface';
import { LLM_PROVIDERS } from './translation-provider.interface';
import { OpenAIProvider } from './openai.provider';
import { ClaudeProvider } from './claude.provider';
import { DeepseekProvider } from './deepseek.provider';
import { GeminiProvider } from './gemini.provider';
import { DeepLProvider } from './deepl.provider';
import { GoogleTranslateProvider } from './google-translate.provider';

export function createTranslationProvider(
  config: ProviderConfig,
): TranslationProvider {
  switch (config.provider) {
    case 'openai':
      return new OpenAIProvider(config.apiKey, config.model, config.baseUrl);
    case 'claude':
      return new ClaudeProvider(config.apiKey, config.model, config.baseUrl);
    case 'deepseek':
      return new DeepseekProvider(config.apiKey, config.model, config.baseUrl);
    case 'gemini':
      return new GeminiProvider(config.apiKey, config.model, config.baseUrl);
    case 'deepl':
      return new DeepLProvider(config.apiKey);
    case 'google-translate':
      return new GoogleTranslateProvider(config.apiKey);
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}

/** Returns true for LLM-based providers that support text generation (key generation) */
export function isLLMProvider(provider: string): boolean {
  return (LLM_PROVIDERS as readonly string[]).includes(provider);
}
