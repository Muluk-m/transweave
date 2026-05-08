/**
 * Translation lint engine — pure utility, no Nest DI required.
 *
 * Rules implemented in this PR:
 *  - placeholder-mismatch: source vs target placeholder set must match
 *  - html-tag-mismatch:    paired <N>...</N> tags present in source must be in target
 *  - length-overflow:      target length exceeds maxLength (per token / module)
 *
 * Deferred (see TODOS.md):
 *  - icu-syntax-invalid (needs @messageformat/parser dependency)
 *  - unescaped-apostrophe (only meaningful inside ICU)
 */

export type LintRule =
  | 'placeholder-mismatch'
  | 'html-tag-mismatch'
  | 'length-overflow';

export type LintSeverity = 'error' | 'warning';

export interface LintIssue {
  rule: LintRule;
  severity: LintSeverity;
  language: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface LintOptions {
  maxLength?: number;
}

/**
 * Match supported placeholder syntaxes:
 *   {var}   {{var}}   %s   %d   %1$s   {0}   <0>   <1>...</1>
 * The auto-detect picks whichever family appears in the source; we keep all
 * families in a single regex to avoid mis-detect when source mixes styles.
 */
const PLACEHOLDER_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: 'curly-double', re: /\{\{[^}]+\}\}/g },
  { name: 'curly-single', re: /\{[^{}]+\}/g },
  { name: 'percent-positional', re: /%\d+\$[sdif]/g },
  { name: 'percent-format', re: /%[sdif]/g },
];

const HTML_PAIR_OPEN_RE = /<(\d+)>/g;
const HTML_PAIR_CLOSE_RE = /<\/(\d+)>/g;

function extractPlaceholders(text: string): Set<string> {
  const all = new Set<string>();
  for (const { re } of PLACEHOLDER_PATTERNS) {
    const matches = text.match(re);
    if (matches) for (const m of matches) all.add(m);
  }
  return all;
}

function extractTagIndices(text: string): { open: Set<string>; close: Set<string> } {
  const open = new Set<string>();
  const close = new Set<string>();
  let m: RegExpExecArray | null;
  HTML_PAIR_OPEN_RE.lastIndex = 0;
  while ((m = HTML_PAIR_OPEN_RE.exec(text))) open.add(m[1]);
  HTML_PAIR_CLOSE_RE.lastIndex = 0;
  while ((m = HTML_PAIR_CLOSE_RE.exec(text))) close.add(m[1]);
  return { open, close };
}

export function lintTranslation(
  sourceText: string,
  targetText: string,
  language: string,
  options: LintOptions = {},
): LintIssue[] {
  const issues: LintIssue[] = [];
  if (!targetText) return issues; // empty target — handled elsewhere

  // 1) Placeholder mismatch
  const sourcePh = extractPlaceholders(sourceText);
  const targetPh = extractPlaceholders(targetText);
  const missing = [...sourcePh].filter((p) => !targetPh.has(p));
  const extra = [...targetPh].filter((p) => !sourcePh.has(p));
  if (missing.length > 0 || extra.length > 0) {
    issues.push({
      rule: 'placeholder-mismatch',
      severity: 'error',
      language,
      message:
        `Placeholder mismatch in ${language}` +
        (missing.length ? ` — missing: ${missing.join(', ')}` : '') +
        (extra.length ? ` — extra: ${extra.join(', ')}` : ''),
      details: { missing, extra },
    });
  }

  // 2) HTML tag mismatch (paired <N>...</N>)
  const sourceTags = extractTagIndices(sourceText);
  const targetTags = extractTagIndices(targetText);
  const missingOpen = [...sourceTags.open].filter((n) => !targetTags.open.has(n));
  const missingClose = [...sourceTags.close].filter((n) => !targetTags.close.has(n));
  const unbalancedTarget = [...targetTags.open].filter((n) => !targetTags.close.has(n));
  if (missingOpen.length || missingClose.length || unbalancedTarget.length) {
    issues.push({
      rule: 'html-tag-mismatch',
      severity: 'error',
      language,
      message: `HTML tag mismatch in ${language}`,
      details: { missingOpen, missingClose, unbalancedTarget },
    });
  }

  // 3) Length overflow
  if (options.maxLength && targetText.length > options.maxLength) {
    issues.push({
      rule: 'length-overflow',
      severity: 'warning',
      language,
      message: `Translation exceeds max length (${targetText.length} > ${options.maxLength})`,
      details: { actualLength: targetText.length, maxLength: options.maxLength },
    });
  }

  return issues;
}

/**
 * Lint all language translations of a token against the source text.
 * The default-language translation is used as the source.
 */
export function lintToken(
  translations: Record<string, string>,
  defaultLang: string,
  options: LintOptions = {},
): LintIssue[] {
  const source = translations[defaultLang] ?? '';
  if (!source) return [];
  const issues: LintIssue[] = [];
  for (const [lang, target] of Object.entries(translations)) {
    if (lang === defaultLang) continue;
    if (!target) continue;
    issues.push(...lintTranslation(source, target, lang, options));
  }
  return issues;
}
