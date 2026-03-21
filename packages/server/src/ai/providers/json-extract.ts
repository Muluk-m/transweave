import type { TranslationResult } from './translation-provider.interface';

/**
 * Extract and parse JSON from a string that may contain markdown code blocks
 * or other wrapping text around the JSON.
 */
export function extractJson(text: string): Record<string, any> | null {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Continue to extraction
  }

  // Try extracting from markdown code blocks: ```json ... ``` or ``` ... ```
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      // Continue to next strategy
    }
  }

  // Try finding a JSON object in the text
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // Give up
    }
  }

  return null;
}

/**
 * Parse LLM response that includes confidence scores.
 * Expected format: { "en": { "text": "...", "confidence": 85 } }
 * Fallback format: { "en": "..." } (no confidence, defaults to 80)
 */
export function parseTranslationResponse(
  raw: Record<string, any>,
): TranslationResult {
  const translations: Record<string, string> = {};
  const confidence: Record<string, number> = {};

  for (const [lang, value] of Object.entries(raw)) {
    if (typeof value === 'string') {
      // Old format: { "en": "text" }
      translations[lang] = value;
      confidence[lang] = 80;
    } else if (value && typeof value === 'object' && 'text' in value) {
      // New format: { "en": { "text": "...", "confidence": 85 } }
      translations[lang] = String(value.text);
      confidence[lang] =
        typeof value.confidence === 'number'
          ? Math.max(0, Math.min(100, Math.round(value.confidence)))
          : 80;
    }
  }

  return { translations, confidence };
}
