/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/**
 * XLIFF 1.2 Serializer
 *
 * Serializes token data into valid XLIFF 1.2 XML using the `xliff` npm package.
 */

import { jsToXliff12 } from 'xliff';

interface TokenLike {
  key: string;
  translations: Record<string, string>;
}

/**
 * Serialize tokens into a valid XLIFF 1.2 XML string.
 *
 * @param tokens - Array of tokens with key and translations
 * @param sourceLanguage - Source language code
 * @param targetLanguage - Target language code
 * @returns XLIFF 1.2 XML string
 */
export async function serializeXliff(
  tokens: TokenLike[],
  sourceLanguage: string,
  targetLanguage: string,
): Promise<string> {
  const resources: Record<string, Record<string, { source: string; target: string }>> = {};
  const namespace = 'namespace';

  resources[namespace] = {};

  for (const token of tokens) {
    const source = token.translations[sourceLanguage] || '';
    const target = token.translations[targetLanguage] || '';

    resources[namespace][token.key] = {
      source,
      target,
    };
  }

  const jsObj = {
    sourceLanguage,
    targetLanguage,
    resources,
  };

  const xml = await jsToXliff12(jsObj);
  return xml as string;
}

/**
 * Create a single-language XLIFF file (alias for serializeXliff for consistency).
 *
 * @param tokens - Array of tokens with key and translations
 * @param sourceLanguage - Source language code
 * @param targetLanguage - Target language code
 * @returns XLIFF 1.2 XML string
 */
export async function createSingleLanguageXliff(
  tokens: TokenLike[],
  sourceLanguage: string,
  targetLanguage: string,
): Promise<string> {
  return serializeXliff(tokens, sourceLanguage, targetLanguage);
}
