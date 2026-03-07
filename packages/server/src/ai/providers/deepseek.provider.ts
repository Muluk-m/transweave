import { BaseOpenAICompatibleProvider } from './base-openai-compatible.provider';

export class DeepseekProvider extends BaseOpenAICompatibleProvider {
  readonly name = 'deepseek';
  protected readonly supportsJsonResponseFormat = true;

  constructor(
    apiKey: string,
    model: string = 'deepseek-chat',
    baseUrl: string = 'https://api.deepseek.com',
  ) {
    super(apiKey, model, baseUrl);
  }
}
