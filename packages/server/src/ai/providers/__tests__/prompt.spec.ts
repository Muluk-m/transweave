import { buildTranslationPrompt } from '../prompt';

describe('buildTranslationPrompt', () => {
  it('should build basic translation prompt', () => {
    const prompt = buildTranslationPrompt('Hello', 'en', ['zh', 'ja']);
    expect(prompt).toContain('"Hello"');
    expect(prompt).toContain('en');
    expect(prompt).toContain('zh, ja');
    expect(prompt).toContain('confidence');
  });

  it('should include glossary terms when provided', () => {
    const prompt = buildTranslationPrompt('Edit your token', 'en', ['zh'], {
      glossaryTerms: [
        {
          sourceTerm: 'token',
          translations: { zh: '词条' },
          doNotTranslate: false,
        },
      ],
    });
    expect(prompt).toContain('Glossary');
    expect(prompt).toContain('"token"');
    expect(prompt).toContain('zh: "词条"');
  });

  it('should mark do-not-translate terms', () => {
    const prompt = buildTranslationPrompt('Welcome to Transweave', 'en', ['zh'], {
      glossaryTerms: [
        {
          sourceTerm: 'Transweave',
          translations: {},
          doNotTranslate: true,
        },
      ],
    });
    expect(prompt).toContain('DO NOT TRANSLATE');
    expect(prompt).toContain('Transweave');
  });

  it('should include TM matches when provided', () => {
    const prompt = buildTranslationPrompt('Hello world', 'en', ['zh'], {
      tmMatches: [
        {
          sourceText: 'Hello everyone',
          targetText: '大家好',
          targetLanguage: 'zh',
          similarity: 85,
        },
      ],
    });
    expect(prompt).toContain('Similar translations');
    expect(prompt).toContain('"Hello everyone"');
    expect(prompt).toContain('大家好');
    expect(prompt).toContain('85% match');
  });

  it('should not include glossary section when empty', () => {
    const prompt = buildTranslationPrompt('Hello', 'en', ['zh'], {
      glossaryTerms: [],
    });
    expect(prompt).not.toContain('Glossary');
  });

  it('should not include TM section when empty', () => {
    const prompt = buildTranslationPrompt('Hello', 'en', ['zh'], {
      tmMatches: [],
    });
    expect(prompt).not.toContain('Similar translations');
  });

  it('should request confidence scores in output', () => {
    const prompt = buildTranslationPrompt('Hello', 'en', ['zh']);
    expect(prompt).toContain('"confidence"');
    expect(prompt).toContain('"text"');
  });
});
