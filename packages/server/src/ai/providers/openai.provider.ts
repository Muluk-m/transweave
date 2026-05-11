import { BaseOpenAICompatibleProvider } from './base-openai-compatible.provider';

export class OpenAIProvider extends BaseOpenAICompatibleProvider {
  readonly name = 'openai';
  protected readonly supportsJsonResponseFormat = true;

  constructor(
    apiKey: string,
    model: string = 'gpt-5.5',
    baseUrl?: string,
  ) {
    super(apiKey, model, baseUrl);
  }
}
