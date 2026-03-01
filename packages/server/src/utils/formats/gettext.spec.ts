import { parsePo, parsePoMultiLanguage } from './gettext.parser';
import { serializePo, createSingleLanguagePo } from './gettext.serializer';

const SAMPLE_PO = `# Translation file
msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"
"Language: zh-CN\\n"
"MIME-Version: 1.0\\n"

msgid "greeting"
msgstr "你好"

msgid "farewell"
msgstr "再见"
`;

const PO_WITH_CONTEXT = `msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"
"Language: de\\n"

msgctxt "menu"
msgid "file"
msgstr "Datei"

msgctxt "noun"
msgid "file"
msgstr "Akte"
`;

const PO_WITH_PLURALS = `msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"
"Language: en\\n"
"Plural-Forms: nplurals=2; plural=(n != 1);\\n"

msgid "one_item"
msgid_plural "many_items"
msgstr[0] "One item"
msgstr[1] "Many items"
`;

const PO_WITH_MULTILINE = `msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"
"Language: en\\n"

msgid "long_text"
msgstr ""
"This is a "
"long text that "
"spans multiple lines"
`;

const EMPTY_PO = `msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"
"Language: en\\n"
`;

describe('Gettext Parser', () => {
  describe('parsePo', () => {
    it('should parse valid .po file into key-value pairs', () => {
      const result = parsePo(SAMPLE_PO, 'zh-CN');
      expect(result).toEqual({
        greeting: '你好',
        farewell: '再见',
      });
    });

    it('should skip the empty-msgid header entry', () => {
      const result = parsePo(SAMPLE_PO, 'zh-CN');
      expect(result['']).toBeUndefined();
    });

    it('should handle msgctxt by prefixing key as "context.msgid"', () => {
      const result = parsePo(PO_WITH_CONTEXT, 'de');
      expect(result).toEqual({
        'menu.file': 'Datei',
        'noun.file': 'Akte',
      });
    });

    it('should handle plural forms by importing msgstr[0] only', () => {
      const result = parsePo(PO_WITH_PLURALS, 'en');
      expect(result['one_item']).toBe('One item');
    });

    it('should handle multiline msgstr', () => {
      const result = parsePo(PO_WITH_MULTILINE, 'en');
      expect(result['long_text']).toBe(
        'This is a long text that spans multiple lines',
      );
    });

    it('should return empty result for PO with only header', () => {
      const result = parsePo(EMPTY_PO, 'en');
      expect(result).toEqual({});
    });

    it('should extract language from PO header', () => {
      // When language param is omitted, it should use header Language
      const result = parsePo(SAMPLE_PO);
      expect(result).toEqual({
        greeting: '你好',
        farewell: '再见',
      });
    });
  });

  describe('parsePoMultiLanguage', () => {
    it('should return language map from PO file', () => {
      const result = parsePoMultiLanguage(SAMPLE_PO);
      expect(result).toEqual({
        'zh-CN': {
          greeting: '你好',
          farewell: '再见',
        },
      });
    });

    it('should return empty result for PO with only header', () => {
      const result = parsePoMultiLanguage(EMPTY_PO);
      expect(result).toEqual({});
    });
  });
});

describe('Gettext Serializer', () => {
  const sampleTokens = [
    { key: 'greeting', translations: { 'zh-CN': '你好' } },
    { key: 'farewell', translations: { 'zh-CN': '再见' } },
  ];

  describe('serializePo', () => {
    it('should serialize tokens into valid .po file string', () => {
      const result = serializePo(sampleTokens, 'zh-CN');
      expect(result).toContain('msgid "greeting"');
      expect(result).toContain('msgstr "你好"');
      expect(result).toContain('msgid "farewell"');
      expect(result).toContain('msgstr "再见"');
    });

    it('should include proper PO header', () => {
      const result = serializePo(sampleTokens, 'zh-CN');
      expect(result.toLowerCase()).toContain('content-type: text/plain; charset=utf-8');
      expect(result).toContain('Language: zh-CN');
    });

    it('should handle special characters in values (quotes)', () => {
      const tokens = [
        { key: 'quoted', translations: { en: 'She said "hello"' } },
      ];
      const result = serializePo(tokens, 'en');
      expect(result).toContain('msgid "quoted"');
      // gettext-parser handles escaping internally
      expect(result).toContain('hello');
    });
  });

  describe('createSingleLanguagePo', () => {
    it('should be an alias for serializePo', () => {
      const result = createSingleLanguagePo(sampleTokens, 'zh-CN');
      expect(result).toContain('msgid "greeting"');
      expect(result).toContain('msgstr "你好"');
    });
  });

  describe('Round-trip', () => {
    it('should produce equivalent data when serialized then parsed', () => {
      const tokens = [
        { key: 'hello', translations: { 'zh-CN': '你好' } },
        { key: 'world', translations: { 'zh-CN': '世界' } },
      ];

      const poContent = serializePo(tokens, 'zh-CN');
      const parsed = parsePo(poContent, 'zh-CN');

      expect(parsed).toEqual({
        hello: '你好',
        world: '世界',
      });
    });
  });
});
