import { BaseOpenAICompatibleProvider } from './base-openai-compatible.provider';

export class OpenAICompatibleProvider extends BaseOpenAICompatibleProvider {
  readonly name: string;

  constructor(apiKey: string, model: string, baseUrl?: string) {
    super(apiKey, model, baseUrl);
    this.name = 'openai-compatible';
  }
}
