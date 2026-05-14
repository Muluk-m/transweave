import { BaseOpenAICompatibleProvider } from './base-openai-compatible.provider';

export class ClaudeProvider extends BaseOpenAICompatibleProvider {
  readonly name = 'claude';

  constructor(
    apiKey: string,
    model: string = 'claude-sonnet-4-6',
    baseUrl: string = 'https://api.anthropic.com/v1/',
  ) {
    super(apiKey, model, baseUrl);
  }
}
