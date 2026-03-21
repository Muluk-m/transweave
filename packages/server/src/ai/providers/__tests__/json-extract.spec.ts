import { extractJson, parseTranslationResponse } from '../json-extract';

describe('extractJson', () => {
  it('should parse direct JSON', () => {
    const result = extractJson('{"en": "Hello"}');
    expect(result).toEqual({ en: 'Hello' });
  });

  it('should extract from markdown code block', () => {
    const result = extractJson('```json\n{"en": "Hello"}\n```');
    expect(result).toEqual({ en: 'Hello' });
  });

  it('should extract from plain code block', () => {
    const result = extractJson('```\n{"en": "Hello"}\n```');
    expect(result).toEqual({ en: 'Hello' });
  });

  it('should extract JSON embedded in text', () => {
    const result = extractJson(
      'Here is the translation:\n{"en": "Hello"}\nDone.',
    );
    expect(result).toEqual({ en: 'Hello' });
  });

  it('should return null for non-JSON text', () => {
    expect(extractJson('not json at all')).toBeNull();
  });
});

describe('parseTranslationResponse', () => {
  it('should parse new format with confidence', () => {
    const result = parseTranslationResponse({
      zh: { text: '你好', confidence: 92 },
      ja: { text: 'こんにちは', confidence: 85 },
    });
    expect(result.translations).toEqual({ zh: '你好', ja: 'こんにちは' });
    expect(result.confidence).toEqual({ zh: 92, ja: 85 });
  });

  it('should parse old format without confidence', () => {
    const result = parseTranslationResponse({
      zh: '你好',
      ja: 'こんにちは',
    });
    expect(result.translations).toEqual({ zh: '你好', ja: 'こんにちは' });
    expect(result.confidence).toEqual({ zh: 80, ja: 80 });
  });

  it('should handle mixed formats', () => {
    const result = parseTranslationResponse({
      zh: { text: '你好', confidence: 90 },
      ja: 'こんにちは',
    });
    expect(result.translations).toEqual({ zh: '你好', ja: 'こんにちは' });
    expect(result.confidence).toEqual({ zh: 90, ja: 80 });
  });

  it('should clamp confidence to 0-100', () => {
    const result = parseTranslationResponse({
      zh: { text: '你好', confidence: 150 },
      ja: { text: 'こんにちは', confidence: -10 },
    });
    expect(result.confidence).toEqual({ zh: 100, ja: 0 });
  });

  it('should default confidence to 80 when missing', () => {
    const result = parseTranslationResponse({
      zh: { text: '你好' },
    });
    expect(result.confidence).toEqual({ zh: 80 });
  });

  it('should round confidence to integer', () => {
    const result = parseTranslationResponse({
      zh: { text: '你好', confidence: 85.7 },
    });
    expect(result.confidence).toEqual({ zh: 86 });
  });
});
