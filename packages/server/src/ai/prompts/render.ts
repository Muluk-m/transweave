import { Logger } from '@nestjs/common';

const logger = new Logger('PromptRender');

/**
 * Render a `{{var}}` template body. Unknown variables are kept literal and
 * logged as a warning so authors can detect typos.
 */
export function renderTemplate(
  body: string,
  variables: Record<string, string | undefined>,
  context?: { templateId?: string; kind?: string },
): string {
  return body.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (match, key) => {
    if (!(key in variables)) {
      logger.warn(
        `Unknown variable {{${key}}} in template ${
          context?.templateId ?? '<builtin>'
        } (kind=${context?.kind ?? 'unknown'})`,
      );
      return match;
    }
    return variables[key] ?? '';
  });
}

/** Build the glossary section block. Returns '' if no terms. */
export function renderGlossarySection(
  terms: Array<{
    sourceTerm: string;
    translations: Record<string, string>;
    doNotTranslate?: boolean;
  }>,
  targetLangs: string[],
): string {
  if (!terms.length) return '';

  const dnt = terms.filter((t) => t.doNotTranslate);
  const regular = terms.filter((t) => !t.doNotTranslate);

  let section = '';
  if (dnt.length) {
    section += `\n\nDO NOT TRANSLATE — keep these terms verbatim in the output:`;
    for (const t of dnt) {
      section += `\n- "${t.sourceTerm}"`;
    }
  }
  if (regular.length) {
    section += `\n\nGlossary (use these exact translations for the following terms):`;
    for (const t of regular) {
      const langPart = targetLangs
        .map((lang) => {
          const tr = t.translations[lang];
          if (tr === undefined) return null;
          if (tr === '') return `${lang}: [MISSING — pick consistent with related terms]`;
          return `${lang}: "${tr}"`;
        })
        .filter(Boolean)
        .join(', ');
      if (langPart) {
        section += `\n- "${t.sourceTerm}" → ${langPart}`;
      }
    }
  }
  return section;
}

/** Build TM section block. Returns '' if no matches. */
export function renderTmSection(
  matches: Array<{
    sourceText: string;
    targetText: string;
    targetLanguage: string;
    similarity: number;
  }>,
): string {
  if (!matches.length) return '';
  let section = `\n\nSimilar translations for reference:`;
  for (const m of matches) {
    section += `\n- "${m.sourceText}" → ${m.targetLanguage}: "${m.targetText}" (${m.similarity}% match)`;
  }
  return section;
}

/** Standard JSON output requirements block for translate kinds. */
export function renderOutputFormat(targetLangs: string[]): string {
  const example = targetLangs
    .map((l) => `"${l}": { "text": "translated text in ${l}", "confidence": 85 }`)
    .join(',\n  ');
  return `Output Requirements:
- Only return a valid JSON object as plain text.
- Do not include any comments, explanations, or Markdown code blocks.
- The result must be strictly parsable with JSON.parse() in JavaScript.
- Ensure all characters are properly escaped to conform to JSON syntax.
- For each target language, provide both the translation and a confidence score (0-100).
  - 90-100: High confidence — common phrases, exact glossary/TM matches
  - 70-89: Medium confidence — standard translations with some ambiguity
  - 0-69: Low confidence — unusual context, specialized terms, or uncertain meaning

Output the result in JSON format as:
{
  ${example}
}`;
}
