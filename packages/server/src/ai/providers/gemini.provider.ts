import { BaseOpenAICompatibleProvider } from './base-openai-compatible.provider';

export class GeminiProvider extends BaseOpenAICompatibleProvider {
  readonly name = 'gemini';

  constructor(
    apiKey: string,
    model: string = 'gemini-2.0-flash',
    baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta/openai/',
  ) {
    super(apiKey, model, baseUrl);
  }
}
