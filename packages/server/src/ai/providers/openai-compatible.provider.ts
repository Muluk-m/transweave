import { BaseOpenAICompatibleProvider } from './base-openai-compatible.provider';

export class OpenAICompatibleProvider extends BaseOpenAICompatibleProvider {
  readonly name = 'openai-compatible';

  constructor(apiKey: string, model: string, baseUrl?: string) {
    super(apiKey, model, baseUrl);
  }
}
