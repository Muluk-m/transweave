import { Injectable } from '@nestjs/common';
import { GlossaryService, ResolvedGlossaryTerm } from './glossary.service';

export interface QaIssue {
  rule: string;
  severity: 'error' | 'warning';
  message: string;
  language: string;
}

export interface QaResult {
  tokenId: string;
  issues: QaIssue[];
  passed: boolean;
}

@Injectable()
export class QaCheckService {
  constructor(private readonly glossaryService: GlossaryService) {}

  checkToken(params: {
    tokenId: string;
    sourceText: string;
    sourceLang: string;
    translations: Record<string, string>;
    glossaryTerms?: ResolvedGlossaryTerm[];
  }): QaResult {
    const issues: QaIssue[] = [];

    for (const [lang, translation] of Object.entries(params.translations)) {
      if (lang === params.sourceLang) continue;
      if (!translation?.trim()) continue;

      issues.push(
        ...this.checkPlaceholders(params.sourceText, translation, lang),
        ...this.checkHtmlTags(params.sourceText, translation, lang),
        ...this.checkLengthAnomaly(params.sourceText, translation, lang),
        ...this.checkUntranslated(params.sourceText, translation, lang),
      );

      if (params.glossaryTerms?.length) {
        issues.push(
          ...this.checkGlossaryConsistency(
            translation,
            lang,
            params.glossaryTerms,
          ),
        );
      }
    }

    return {
      tokenId: params.tokenId,
      issues,
      passed: issues.length === 0,
    };
  }

  /** Check that placeholders ({name}, {{count}}, %s, %d, %@) are preserved */
  private checkPlaceholders(
    source: string,
    translation: string,
    lang: string,
  ): QaIssue[] {
    const placeholderPattern = /\{\{?\w+\}?\}|%[sd@]|%\d+\$[sd@]/g;
    const sourcePlaceholders = [...(source.match(placeholderPattern) || [])].sort();
    const translationPlaceholders = [
      ...(translation.match(placeholderPattern) || []),
    ].sort();

    if (sourcePlaceholders.length === 0) return [];

    const missing = sourcePlaceholders.filter(
      (p) => !translationPlaceholders.includes(p),
    );
    const extra = translationPlaceholders.filter(
      (p) => !sourcePlaceholders.includes(p),
    );

    const issues: QaIssue[] = [];
    if (missing.length > 0) {
      issues.push({
        rule: 'placeholder-missing',
        severity: 'error',
        message: `Missing placeholders: ${missing.join(', ')}`,
        language: lang,
      });
    }
    if (extra.length > 0) {
      issues.push({
        rule: 'placeholder-extra',
        severity: 'warning',
        message: `Extra placeholders: ${extra.join(', ')}`,
        language: lang,
      });
    }
    return issues;
  }

  /** Check that HTML tags are properly paired */
  private checkHtmlTags(
    source: string,
    translation: string,
    lang: string,
  ): QaIssue[] {
    const tagPattern = /<\/?[a-zA-Z][a-zA-Z0-9]*[^>]*>/g;
    const sourceTags = [...(source.match(tagPattern) || [])].sort();
    const translationTags = [...(translation.match(tagPattern) || [])].sort();

    if (sourceTags.length === 0) return [];
    if (sourceTags.join(',') === translationTags.join(',')) return [];

    return [
      {
        rule: 'html-tag-mismatch',
        severity: 'error',
        message: `HTML tags mismatch: source has [${sourceTags.join(', ')}], translation has [${translationTags.join(', ')}]`,
        language: lang,
      },
    ];
  }

  /** Check if translation length is abnormal compared to source */
  private checkLengthAnomaly(
    source: string,
    translation: string,
    lang: string,
  ): QaIssue[] {
    if (source.length < 5) return []; // skip very short strings
    const ratio = translation.length / source.length;
    if (ratio > 3) {
      return [
        {
          rule: 'length-too-long',
          severity: 'warning',
          message: `Translation is ${ratio.toFixed(1)}x longer than source`,
          language: lang,
        },
      ];
    }
    if (ratio < 0.2) {
      return [
        {
          rule: 'length-too-short',
          severity: 'warning',
          message: `Translation is ${ratio.toFixed(1)}x shorter than source`,
          language: lang,
        },
      ];
    }
    return [];
  }

  /** Check if translation is identical to source (possibly untranslated) */
  private checkUntranslated(
    source: string,
    translation: string,
    lang: string,
  ): QaIssue[] {
    if (source === translation && source.length > 3) {
      return [
        {
          rule: 'untranslated',
          severity: 'warning',
          message: 'Translation is identical to source text',
          language: lang,
        },
      ];
    }
    return [];
  }

  /** Check if glossary terms are used correctly in translation */
  private checkGlossaryConsistency(
    translation: string,
    lang: string,
    glossaryTerms: ResolvedGlossaryTerm[],
  ): QaIssue[] {
    const issues: QaIssue[] = [];

    for (const term of glossaryTerms) {
      const expectedTranslation = term.translations[lang];
      if (!expectedTranslation) continue;

      if (term.doNotTranslate) {
        // For DNT terms, the source term should appear as-is
        if (!translation.includes(term.sourceTerm)) {
          issues.push({
            rule: 'glossary-dnt-missing',
            severity: 'warning',
            message: `Do-not-translate term "${term.sourceTerm}" not found in translation`,
            language: lang,
          });
        }
      } else {
        // For regular terms, the expected translation should appear
        if (!translation.includes(expectedTranslation)) {
          issues.push({
            rule: 'glossary-term-missing',
            severity: 'warning',
            message: `Expected glossary translation "${expectedTranslation}" for term "${term.sourceTerm}" not found`,
            language: lang,
          });
        }
      }
    }

    return issues;
  }
}
