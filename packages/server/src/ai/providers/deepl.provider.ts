import type { TranslationProvider } from './translation-provider.interface';

export class DeepLProvider implements TranslationProvider {
  readonly name = 'deepl';
  private baseUrl: string;

  constructor(private apiKey: string) {
    // DeepL free keys end with ':fx', use free API endpoint
    this.baseUrl = apiKey.endsWith(':fx')
      ? 'https://api-free.deepl.com/v2'
      : 'https://api.deepl.com/v2';
  }

  async translate(params: {
    text: string;
    from: string;
    to: string[];
  }): Promise<Record<string, string>> {
    const results: Record<string, string> = {};

    // DeepL translates one target language at a time
    for (const targetLang of params.to) {
      const response = await fetch(`${this.baseUrl}/translate`, {
        method: 'POST',
        headers: {
          Authorization: `DeepL-Auth-Key ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: [params.text],
          source_lang: this.mapLanguageCode(params.from),
          target_lang: this.mapLanguageCode(targetLang),
        }),
      });

      if (!response.ok) {
        throw new Error(`DeepL error: ${response.status}`);
      }

      const data = await response.json();
      results[targetLang] = data.translations[0].text;
    }

    return results;
  }

  private mapLanguageCode(code: string): string {
    const mapping: Record<string, string> = {
      en: 'EN',
      zh: 'ZH',
      'zh-CN': 'ZH-HANS',
      'zh-TW': 'ZH-HANT',
      pt: 'PT-PT',
      'pt-BR': 'PT-BR',
    };
    return mapping[code] || code.toUpperCase();
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/usage`, {
        headers: { Authorization: `DeepL-Auth-Key ${this.apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
