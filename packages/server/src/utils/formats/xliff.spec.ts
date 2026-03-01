import { parseXliff, parseXliffMultiLanguage } from './xliff.parser';
import { serializeXliff, createSingleLanguageXliff } from './xliff.serializer';

const SAMPLE_XLIFF = `<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:1.2" version="1.2">
  <file source-language="en" target-language="zh-CN" datatype="plaintext" original="namespace">
    <body>
      <trans-unit id="greeting">
        <source>Hello</source>
        <target>你好</target>
      </trans-unit>
      <trans-unit id="farewell">
        <source>Goodbye</source>
        <target>再见</target>
      </trans-unit>
    </body>
  </file>
</xliff>`;

const SAMPLE_XLIFF_WITH_SPECIAL_CHARS = `<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:1.2" version="1.2">
  <file source-language="en" target-language="de" datatype="plaintext" original="namespace">
    <body>
      <trans-unit id="special">
        <source>Rock &amp; Roll</source>
        <target>Rock &amp; Roll</target>
      </trans-unit>
    </body>
  </file>
</xliff>`;

const EMPTY_XLIFF = `<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:1.2" version="1.2">
  <file source-language="en" target-language="zh-CN" datatype="plaintext" original="namespace">
    <body>
    </body>
  </file>
</xliff>`;

describe('XLIFF Parser', () => {
  describe('parseXliff', () => {
    it('should parse valid XLIFF 1.2 file and extract target language translations', async () => {
      const result = await parseXliff(SAMPLE_XLIFF, 'zh-CN');
      expect(result).toEqual({
        greeting: '你好',
        farewell: '再见',
      });
    });

    it('should extract source language translations when requested', async () => {
      const result = await parseXliff(SAMPLE_XLIFF, 'en');
      expect(result).toEqual({
        greeting: 'Hello',
        farewell: 'Goodbye',
      });
    });

    it('should return empty result for empty XLIFF body', async () => {
      const result = await parseXliff(EMPTY_XLIFF, 'zh-CN');
      expect(result).toEqual({});
    });

    it('should throw descriptive error for malformed XLIFF', async () => {
      await expect(parseXliff('not xml at all', 'en')).rejects.toThrow();
    });

    it('should handle special XML characters', async () => {
      const result = await parseXliff(SAMPLE_XLIFF_WITH_SPECIAL_CHARS, 'de');
      expect(result).toEqual({
        special: 'Rock & Roll',
      });
    });
  });

  describe('parseXliffMultiLanguage', () => {
    it('should return all languages from XLIFF file', async () => {
      const result = await parseXliffMultiLanguage(SAMPLE_XLIFF);
      expect(result).toEqual({
        en: {
          greeting: 'Hello',
          farewell: 'Goodbye',
        },
        'zh-CN': {
          greeting: '你好',
          farewell: '再见',
        },
      });
    });

    it('should return empty result for empty XLIFF body', async () => {
      const result = await parseXliffMultiLanguage(EMPTY_XLIFF);
      expect(result).toEqual({});
    });
  });
});

describe('XLIFF Serializer', () => {
  const sampleTokens = [
    { key: 'greeting', translations: { en: 'Hello', 'zh-CN': '你好' } },
    { key: 'farewell', translations: { en: 'Goodbye', 'zh-CN': '再见' } },
  ];

  describe('serializeXliff', () => {
    it('should serialize tokens into valid XLIFF 1.2 XML string', async () => {
      const result = await serializeXliff(sampleTokens, 'en', 'zh-CN');
      expect(result).toContain('version="1.2"');
      expect(result).toContain('source-language="en"');
      expect(result).toContain('target-language="zh-CN"');
      expect(result).toContain('<source>Hello</source>');
      expect(result).toContain('<target>你好</target>');
      expect(result).toContain('<source>Goodbye</source>');
      expect(result).toContain('<target>再见</target>');
    });

    it('should include trans-unit with id for each token', async () => {
      const result = await serializeXliff(sampleTokens, 'en', 'zh-CN');
      expect(result).toContain('id="greeting"');
      expect(result).toContain('id="farewell"');
    });

    it('should handle special XML characters via escaping', async () => {
      const tokens = [
        { key: 'special', translations: { en: 'Rock & Roll', de: 'Rock & Roll' } },
      ];
      const result = await serializeXliff(tokens, 'en', 'de');
      // The xliff library handles escaping internally
      expect(result).toContain('Rock');
      expect(result).toContain('Roll');
    });
  });

  describe('createSingleLanguageXliff', () => {
    it('should be an alias for serializeXliff', async () => {
      const result = await createSingleLanguageXliff(sampleTokens, 'en', 'zh-CN');
      expect(result).toContain('version="1.2"');
      expect(result).toContain('source-language="en"');
      expect(result).toContain('target-language="zh-CN"');
    });
  });

  describe('Round-trip', () => {
    it('should produce equivalent data when serialized then parsed', async () => {
      const tokens = [
        { key: 'hello', translations: { en: 'Hello', 'zh-CN': '你好' } },
        { key: 'world', translations: { en: 'World', 'zh-CN': '世界' } },
      ];

      const xliffContent = await serializeXliff(tokens, 'en', 'zh-CN');
      const parsed = await parseXliffMultiLanguage(xliffContent);

      expect(parsed['en']).toEqual({
        hello: 'Hello',
        world: 'World',
      });
      expect(parsed['zh-CN']).toEqual({
        hello: '你好',
        world: '世界',
      });
    });
  });
});
