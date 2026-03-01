/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/**
 * Gettext .po Parser
 *
 * Parses Gettext .po files into key-translation pairs using `gettext-parser`.
 */

import * as gettextParser from 'gettext-parser';

/**
 * Parse a .po file and extract translations for a single language.
 *
 * @param content - .po file content string
 * @param language - Language code (optional, extracted from PO header if omitted)
 * @returns Record of key -> translation value
 */
export function parsePo(
  content: string,
  language?: string,
): Record<string, string> {
  const parsed = gettextParser.po.parse(content);
  const result: Record<string, string> = {};

  const translations = parsed.translations;

  // Iterate over all contexts
  for (const [context, entries] of Object.entries(translations)) {
    for (const [msgid, entry] of Object.entries(entries as Record<string, any>)) {
      // Skip header entry (empty msgid)
      if (msgid === '') continue;

      // Build key: if context exists, prefix as "context.msgid"
      const key = context ? `${context}.${msgid}` : msgid;

      // Get translation value - msgstr is an array, take [0]
      const msgstr = entry.msgstr;
      if (Array.isArray(msgstr) && msgstr.length > 0) {
        result[key] = msgstr[0];
      }
    }
  }

  return result;
}

/**
 * Parse a .po file and return all languages.
 * Since .po files are single-language, this wraps the result with the language key.
 *
 * @param content - .po file content string
 * @returns Record of language -> (key -> translation value)
 */
export function parsePoMultiLanguage(
  content: string,
): Record<string, Record<string, string>> {
  const parsed = gettextParser.po.parse(content);
  const lang = parsed.headers?.['Language'] || 'unknown';

  const translations = parsePo(content, lang);

  // If no translations were found, return empty
  if (Object.keys(translations).length === 0) {
    return {};
  }

  return { [lang]: translations };
}
