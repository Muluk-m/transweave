import type { TranslationProvider } from './translation-provider.interface';
import { buildTranslationPrompt } from './prompt';
import { extractJson } from './json-extract';

export class OpenAIProvider implements TranslationProvider {
  readonly name = 'openai';
  private client: any;

  constructor(
    private apiKey: string,
    private model: string = 'gpt-4o-mini',
    private baseUrl?: string,
  ) {}

  private async getClient() {
    if (!this.client) {
      const { default: OpenAI } = await import('openai');
      this.client = new OpenAI({
        apiKey: this.apiKey,
        ...(this.baseUrl && { baseURL: this.baseUrl }),
      });
    }
    return this.client;
  }

  async translate(params: {
    text: string;
    from: string;
    to: string[];
  }): Promise<Record<string, string>> {
    const client = await this.getClient();
    const prompt = buildTranslationPrompt(params.text, params.from, params.to);

    const response = await client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response from OpenAI');

    const parsed = extractJson(content);
    if (!parsed) throw new Error('Failed to parse JSON from OpenAI response');
    return parsed;
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const client = await this.getClient();
      await client.models.list();
      return true;
    } catch {
      return false;
    }
  }

  async generateText(prompt: string): Promise<string> {
    const client = await this.getClient();
    const response = await client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty response from OpenAI');
    return content.trim();
  }
}
