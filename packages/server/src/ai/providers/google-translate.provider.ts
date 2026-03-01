import type { TranslationProvider } from './translation-provider.interface';

const GOOGLE_TRANSLATE_BASE =
  'https://translation.googleapis.com/language/translate/v2';

export class GoogleTranslateProvider implements TranslationProvider {
  readonly name = 'google-translate';

  constructor(private apiKey: string) {}

  async translate(params: {
    text: string;
    from: string;
    to: string[];
  }): Promise<Record<string, string>> {
    const results: Record<string, string> = {};

    // Google Translate translates one target language at a time
    for (const targetLang of params.to) {
      const response = await fetch(GOOGLE_TRANSLATE_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: params.text,
          source: params.from,
          target: targetLang,
          key: this.apiKey,
          format: 'text',
        }),
      });

      if (!response.ok) {
        throw new Error(`Google Translate error: ${response.status}`);
      }

      const data = await response.json();
      results[targetLang] = data.data.translations[0].translatedText;
    }

    return results;
  }

  async validateApiKey(): Promise<boolean> {
    try {
      const response = await fetch(GOOGLE_TRANSLATE_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: 'hello',
          source: 'en',
          target: 'es',
          key: this.apiKey,
          format: 'text',
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
