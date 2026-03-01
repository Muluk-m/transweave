/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/**
 * XLIFF 1.2 Parser
 *
 * Parses XLIFF 1.2 files into key-translation pairs using the `xliff` npm package.
 */

import { xliff12ToJs } from 'xliff';

/**
 * Parse XLIFF 1.2 content and extract translations for a single language.
 *
 * @param content - XLIFF XML string
 * @param language - Target language code to extract (optional, defaults to target language in file)
 * @returns Record of key -> translation value
 */
export async function parseXliff(
  content: string,
  language?: string,
): Promise<Record<string, string>> {
  const parsed = await xliff12ToJs(content);
  const result: Record<string, string> = {};

  const srcLang = parsed.sourceLanguage;
  const trgLang = parsed.targetLanguage;

  if (!parsed.resources) {
    return result;
  }

  for (const namespace of Object.values(parsed.resources)) {
    for (const [key, unit] of Object.entries(namespace as Record<string, any>)) {
      if (!unit || typeof unit !== 'object') continue;

      let value: string | undefined;

      if (language === srcLang) {
        value = typeof unit.source === 'string' ? unit.source : undefined;
      } else if (!language || language === trgLang) {
        value = typeof unit.target === 'string' ? unit.target : undefined;
      }

      if (value !== undefined) {
        result[key] = value;
      }
    }
  }

  return result;
}

/**
 * Parse XLIFF 1.2 content and extract all languages.
 *
 * @param content - XLIFF XML string
 * @returns Record of language -> (key -> translation value)
 */
export async function parseXliffMultiLanguage(
  content: string,
): Promise<Record<string, Record<string, string>>> {
  const parsed = await xliff12ToJs(content);
  const result: Record<string, Record<string, string>> = {};

  const srcLang = parsed.sourceLanguage;
  const trgLang = parsed.targetLanguage;

  if (!parsed.resources) {
    return result;
  }

  for (const namespace of Object.values(parsed.resources)) {
    for (const [key, unit] of Object.entries(namespace as Record<string, any>)) {
      if (!unit || typeof unit !== 'object') continue;

      if (srcLang && typeof unit.source === 'string') {
        if (!result[srcLang]) result[srcLang] = {};
        result[srcLang][key] = unit.source;
      }

      if (trgLang && typeof unit.target === 'string') {
        if (!result[trgLang]) result[trgLang] = {};
        result[trgLang][key] = unit.target;
      }
    }
  }

  return result;
}
