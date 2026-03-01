/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/**
 * Gettext .po Serializer
 *
 * Serializes token data into valid .po file format using `gettext-parser`.
 */

import * as gettextParser from 'gettext-parser';

interface TokenLike {
  key: string;
  translations: Record<string, string>;
}

/**
 * Serialize tokens into a valid .po file string.
 *
 * @param tokens - Array of tokens with key and translations
 * @param language - Language code for the translations
 * @returns .po file content string
 */
export function serializePo(tokens: TokenLike[], language: string): string {
  const data: any = {
    charset: 'utf-8',
    headers: {
      'Content-Type': 'text/plain; charset=UTF-8',
      'Content-Transfer-Encoding': '8bit',
      'MIME-Version': '1.0',
      Language: language,
    },
    translations: {
      '': {
        '': {
          msgid: '',
          msgstr: [
            `Content-Type: text/plain; charset=UTF-8\nContent-Transfer-Encoding: 8bit\nMIME-Version: 1.0\nLanguage: ${language}\n`,
          ],
        },
      },
    },
  };

  // Add each token as a msgid/msgstr pair
  for (const token of tokens) {
    const value = token.translations[language] || '';
    data.translations[''][token.key] = {
      msgid: token.key,
      msgstr: [value],
    };
  }

  const buffer = gettextParser.po.compile(data);
  return buffer.toString('utf-8');
}

/**
 * Create a single-language .po file (alias for serializePo for consistency).
 *
 * @param tokens - Array of tokens with key and translations
 * @param language - Language code
 * @returns .po file content string
 */
export function createSingleLanguagePo(
  tokens: TokenLike[],
  language: string,
): string {
  return serializePo(tokens, language);
}
