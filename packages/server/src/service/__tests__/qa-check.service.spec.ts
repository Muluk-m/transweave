import { QaCheckService } from '../qa-check.service';
import type { ResolvedGlossaryTerm } from '../glossary.service';

describe('QaCheckService', () => {
  let service: QaCheckService;

  beforeEach(() => {
    // QaCheckService only uses glossaryService for its type, not injected
    service = new QaCheckService({} as any);
  });

  describe('placeholder checks', () => {
    it('should pass when placeholders match', () => {
      const result = service.checkToken({
        tokenId: '1',
        sourceText: 'Hello {name}, you have {count} messages',
        sourceLang: 'en',
        translations: { zh: '你好 {name}，你有 {count} 条消息' },
      });
      expect(result.passed).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect missing placeholders', () => {
      const result = service.checkToken({
        tokenId: '1',
        sourceText: 'Hello {name}, you have {count} messages',
        sourceLang: 'en',
        translations: { zh: '你好，你有消息' },
      });
      expect(result.passed).toBe(false);
      const issue = result.issues.find((i) => i.rule === 'placeholder-missing');
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe('error');
      expect(issue!.language).toBe('zh');
    });

    it('should detect extra placeholders', () => {
      const result = service.checkToken({
        tokenId: '1',
        sourceText: 'Hello {name}',
        sourceLang: 'en',
        translations: { zh: '你好 {name} {extra}' },
      });
      const issue = result.issues.find((i) => i.rule === 'placeholder-extra');
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe('warning');
    });

    it('should handle %s and %d placeholders', () => {
      const result = service.checkToken({
        tokenId: '1',
        sourceText: 'File %s has %d items',
        sourceLang: 'en',
        translations: { zh: '文件 %s 有 %d 个项目' },
      });
      expect(result.passed).toBe(true);
    });

    it('should skip source language in checks', () => {
      const result = service.checkToken({
        tokenId: '1',
        sourceText: 'Hello {name}',
        sourceLang: 'en',
        translations: { en: 'Hello' }, // source lang, should be skipped
      });
      expect(result.passed).toBe(true);
    });
  });

  describe('HTML tag checks', () => {
    it('should pass when HTML tags match', () => {
      const result = service.checkToken({
        tokenId: '1',
        sourceText: 'Click <b>here</b> to <a>continue</a>',
        sourceLang: 'en',
        translations: { zh: '点击 <b>这里</b> 来 <a>继续</a>' },
      });
      expect(result.passed).toBe(true);
    });

    it('should detect missing HTML tags', () => {
      const result = service.checkToken({
        tokenId: '1',
        sourceText: 'Click <b>here</b>',
        sourceLang: 'en',
        translations: { zh: '点击这里' },
      });
      const issue = result.issues.find((i) => i.rule === 'html-tag-mismatch');
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe('error');
    });
  });

  describe('length anomaly checks', () => {
    it('should warn when translation is too long', () => {
      const result = service.checkToken({
        tokenId: '1',
        sourceText: 'Hello world',
        sourceLang: 'en',
        translations: {
          zh: 'A'.repeat(100), // >3x longer
        },
      });
      const issue = result.issues.find((i) => i.rule === 'length-too-long');
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe('warning');
    });

    it('should warn when translation is too short', () => {
      const result = service.checkToken({
        tokenId: '1',
        sourceText: 'This is a fairly long source text for testing',
        sourceLang: 'en',
        translations: { zh: 'Hi' },
      });
      const issue = result.issues.find((i) => i.rule === 'length-too-short');
      expect(issue).toBeDefined();
    });

    it('should skip length check for very short strings', () => {
      const result = service.checkToken({
        tokenId: '1',
        sourceText: 'OK',
        sourceLang: 'en',
        translations: { zh: '好的，我明白了' },
      });
      const lengthIssues = result.issues.filter(
        (i) => i.rule === 'length-too-long' || i.rule === 'length-too-short',
      );
      expect(lengthIssues).toHaveLength(0);
    });
  });

  describe('untranslated check', () => {
    it('should detect identical source and translation', () => {
      const result = service.checkToken({
        tokenId: '1',
        sourceText: 'Settings',
        sourceLang: 'en',
        translations: { zh: 'Settings' },
      });
      const issue = result.issues.find((i) => i.rule === 'untranslated');
      expect(issue).toBeDefined();
    });

    it('should not flag very short identical strings', () => {
      const result = service.checkToken({
        tokenId: '1',
        sourceText: 'OK',
        sourceLang: 'en',
        translations: { zh: 'OK' },
      });
      const issue = result.issues.find((i) => i.rule === 'untranslated');
      expect(issue).toBeUndefined();
    });
  });

  describe('glossary consistency checks', () => {
    const glossaryTerms: ResolvedGlossaryTerm[] = [
      {
        sourceTerm: 'Transweave',
        translations: { zh: 'Transweave', ja: 'Transweave' },
        caseSensitive: false,
        doNotTranslate: true,
      },
      {
        sourceTerm: 'token',
        translations: { zh: '词条', ja: 'トークン' },
        caseSensitive: false,
        doNotTranslate: false,
      },
    ];

    it('should detect missing DNT term', () => {
      const result = service.checkToken({
        tokenId: '1',
        sourceText: 'Welcome to Transweave',
        sourceLang: 'en',
        translations: { zh: '欢迎来到翻译平台' },
        glossaryTerms,
      });
      const issue = result.issues.find(
        (i) => i.rule === 'glossary-dnt-missing',
      );
      expect(issue).toBeDefined();
    });

    it('should pass when DNT term is preserved', () => {
      const result = service.checkToken({
        tokenId: '1',
        sourceText: 'Welcome to Transweave',
        sourceLang: 'en',
        translations: { zh: '欢迎来到 Transweave' },
        glossaryTerms,
      });
      const dntIssues = result.issues.filter(
        (i) => i.rule === 'glossary-dnt-missing',
      );
      expect(dntIssues).toHaveLength(0);
    });

    it('should detect missing glossary term translation', () => {
      const result = service.checkToken({
        tokenId: '1',
        sourceText: 'Edit your token',
        sourceLang: 'en',
        translations: { zh: '编辑你的令牌' }, // should use 词条
        glossaryTerms,
      });
      const issue = result.issues.find(
        (i) => i.rule === 'glossary-term-missing',
      );
      expect(issue).toBeDefined();
    });

    it('should pass when glossary term translation is used', () => {
      const result = service.checkToken({
        tokenId: '1',
        sourceText: 'Edit your token',
        sourceLang: 'en',
        translations: { zh: '编辑你的词条' },
        glossaryTerms,
      });
      const termIssues = result.issues.filter(
        (i) => i.rule === 'glossary-term-missing',
      );
      expect(termIssues).toHaveLength(0);
    });
  });

  describe('multiple languages', () => {
    it('should check all target languages independently', () => {
      const result = service.checkToken({
        tokenId: '1',
        sourceText: 'Hello {name}',
        sourceLang: 'en',
        translations: {
          zh: '你好 {name}',
          ja: 'こんにちは', // missing placeholder
        },
      });
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].language).toBe('ja');
    });
  });

  describe('edge cases', () => {
    it('should handle empty translations', () => {
      const result = service.checkToken({
        tokenId: '1',
        sourceText: 'Hello',
        sourceLang: 'en',
        translations: { zh: '' },
      });
      expect(result.passed).toBe(true); // empty is skipped
    });

    it('should handle no translations', () => {
      const result = service.checkToken({
        tokenId: '1',
        sourceText: 'Hello',
        sourceLang: 'en',
        translations: {},
      });
      expect(result.passed).toBe(true);
    });
  });
});
