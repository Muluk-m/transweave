import type { PromptKind } from '../../db/schema';

export interface BuiltinTemplate {
  kind: PromptKind;
  name: string;
  body: string;
  variables: string[];
}

const TRANSLATE_VARS = [
  'sourceText',
  'sourceLang',
  'targetLangs',
  'glossarySection',
  'tmSection',
  'outputFormat',
];

const buildTranslateBody = (lead: string) =>
  `${lead}

Input:
- Text: "{{sourceText}}"
- Source Language (ISO 639-1): {{sourceLang}}
- Target Languages (ISO 639-1): [{{targetLangs}}]
{{glossarySection}}{{tmSection}}

{{outputFormat}}`;

const translate = (kind: PromptKind, name: string, lead: string): BuiltinTemplate => ({
  kind,
  name,
  body: buildTranslateBody(lead),
  variables: TRANSLATE_VARS,
});

export const BUILTIN_TEMPLATES: Record<PromptKind, BuiltinTemplate> = {
  translate: translate(
    'translate',
    'Default · Single translate',
    `You are a professional translation engine. Translate the following text from the source language to each of the target languages. Maintain the meaning, tone, and formatting as accurately as possible.`,
  ),
  translate_plural: translate(
    'translate_plural',
    'Default · Plural-aware translate',
    `You are a professional translation engine. The source text contains an ICU plural expression. Translate while preserving the ICU syntax and ensuring each plural form (one/other/few/many/zero) is correctly localised for each target language's CLDR plural rules.`,
  ),
  translate_batch: translate(
    'translate_batch',
    'Default · Batch translate',
    `You are a professional translation engine. Translate the text below from the source language to each of the target languages. Keep the wording consistent with prior translations supplied as TM matches.`,
  ),
  tone_adjust: {
    kind: 'tone_adjust',
    name: 'Default · Tone adjust',
    body: `You are an expert localisation copywriter. Rewrite the existing translation in the requested tone while preserving the original meaning and any placeholders / HTML tags.

Original translation: "{{sourceText}}"
Target language (ISO 639-1): {{targetLang}}
Requested tone: {{toneStyle}}
{{customInstruction}}

Output Requirements:
- Return a JSON array of exactly 3 candidate strings.
- Do not include comments, explanations, or Markdown.
- Each candidate must use the same placeholders/tags as the original.

Output:
{
  "candidates": ["candidate 1", "candidate 2", "candidate 3"]
}`,
    variables: ['sourceText', 'targetLang', 'toneStyle', 'customInstruction'],
  },
};

export function getBuiltinTemplate(kind: PromptKind): BuiltinTemplate {
  return BUILTIN_TEMPLATES[kind];
}
