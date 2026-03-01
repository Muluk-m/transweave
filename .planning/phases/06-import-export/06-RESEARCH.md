# Phase 6: Import & Export - Research

**Researched:** 2026-03-01
**Domain:** Multi-format file import/export for i18n translation management
**Confidence:** HIGH

## Summary

Phase 6 extends the existing import/export system to support XLIFF and Gettext (.po) formats, adds these new formats to the export pipeline, and ensures the import preview/diff feature works across all formats. The codebase already has a substantial import/export foundation: `exportTo.ts` handles JSON/CSV/XML/YAML export (including ZIP packaging with per-language files), `importFrom.ts` handles JSON/CSV/XML/YAML import parsing, `project.service.ts` implements both `importProjectTokens` and `previewImportTokens`, and the frontend has complete `ProjectImportTab` and `ProjectExportTab` components with drag-drop upload, language selection, and preview dialog.

The primary work is: (1) add XLIFF and Gettext parsers/serializers to the existing utility files, (2) register the new formats in the service and controller layers, and (3) update the frontend format selectors and dropzone accept lists. The existing architecture is well-structured for extension -- each format is a switch case in the parse/export functions, and adding new formats follows the same pattern.

The critical insight is that both XLIFF and Gettext have well-defined specifications. XLIFF 1.2 is an XML-based format (OASIS standard) that wraps translation units with source/target pairs. Gettext .po files are a line-oriented text format using `msgid`/`msgstr` pairs. Both can be parsed without heavy dependencies, though using established libraries reduces edge-case risk significantly.

**Primary recommendation:** Use `xliff` (npm package) for XLIFF parsing/serialization and hand-roll the Gettext .po parser (the format is simple enough and avoids adding a heavy dependency for a straightforward line-oriented format). Alternatively, use `gettext-parser` for .po files if zero edge-case risk is desired.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| IMEX-01 | User can import translations from JSON files | Already implemented in `importFrom.ts` and `project.service.ts`. Needs migration to new DB layer (Phase 5 prerequisite). |
| IMEX-02 | User can import translations from YAML files | Already implemented in `importFrom.ts`. Needs migration to new DB layer. |
| IMEX-03 | User can import translations from XLIFF files | New format. Add XLIFF parser to `importFrom.ts`. Use `xliff` npm package or build parser for XLIFF 1.2 `<trans-unit>` elements. |
| IMEX-04 | User can import translations from Gettext (.po) files | New format. Add .po parser to `importFrom.ts`. Parse `msgid`/`msgstr` pairs, handle `msgctxt` as key prefix. |
| IMEX-05 | User can export translations in JSON, YAML, CSV, XLIFF, and Gettext formats | JSON/YAML/CSV already in `exportTo.ts`. Add XLIFF and Gettext serializers. Update `createZipWithLanguageFiles` to support new formats. |
| IMEX-06 | Import preview shows diff of changes before applying | Already implemented in `previewImportTokens` service method and `ProjectImportTab` frontend component. Needs to work with XLIFF and Gettext formats (automatic once parsers are registered). |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `xliff` | ^6.x | XLIFF 1.2/2.0 parsing and serialization | Most popular XLIFF library on npm (~15k weekly downloads). Handles both XLIFF 1.2 and 2.0. Returns JS objects, easy to integrate. |
| `gettext-parser` | ^4.x | Gettext .po/.mo file parsing and compilation | De facto standard for Gettext in Node.js (~150k weekly downloads). Used by `i18next`, `ttag`, and most i18n toolchains. Handles plurals, contexts, headers. |
| `js-yaml` | ^4.x | Robust YAML parsing/serialization | Already implied by codebase (current YAML parser is hand-rolled). Using js-yaml eliminates edge cases with multi-line strings, anchors, special characters. ~35M weekly downloads. |
| `jszip` | ^3.10.1 | ZIP file generation for export bundles | Already installed and used in `exportTo.ts`. No change needed. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `fast-xml-parser` | ^4.x | Robust XML parsing for XLIFF fallback | Only if `xliff` package doesn't cover edge cases. The current regex-based XML parser in `importFrom.ts` is fragile. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `xliff` npm package | Hand-rolled XML parser | Lower dependency count but XLIFF has complex structure (notes, alt-trans, groups). Library is safer. |
| `gettext-parser` | Hand-rolled .po parser | .po format is simple enough to parse manually. But `gettext-parser` handles edge cases (plurals, escaped chars, multiline msgstr, .mo binary format). |
| `js-yaml` | Current hand-rolled YAML parser | Current parser is fragile (breaks on colons in values, special chars, nested structures deeper than 2 levels). js-yaml is battle-tested. |

**Installation:**
```bash
cd packages/server && pnpm add xliff gettext-parser js-yaml && pnpm add -D @types/js-yaml
```

Note: `gettext-parser` ships its own TypeScript types. `xliff` v6 includes types. `@types/gettext-parser` may be needed if types are missing.

## Architecture Patterns

### Recommended Project Structure
```
packages/server/src/
├── utils/
│   ├── formats/              # NEW: Format-specific parsers/serializers
│   │   ├── index.ts          # Re-exports, format registry
│   │   ├── json.parser.ts    # Extracted from importFrom.ts
│   │   ├── json.serializer.ts # Extracted from exportTo.ts
│   │   ├── yaml.parser.ts
│   │   ├── yaml.serializer.ts
│   │   ├── csv.parser.ts
│   │   ├── csv.serializer.ts
│   │   ├── xliff.parser.ts   # NEW
│   │   ├── xliff.serializer.ts # NEW
│   │   ├── gettext.parser.ts # NEW
│   │   ├── gettext.serializer.ts # NEW
│   │   └── types.ts          # Shared types for format handlers
│   ├── importFrom.ts         # Refactored to use format registry
│   └── exportTo.ts           # Refactored to use format registry
```

### Pattern 1: Format Handler Registry
**What:** Each format implements a standard interface (parse + serialize). A registry maps format identifiers to handlers. Adding new formats requires only registering a new handler.
**When to use:** When the codebase already uses a switch/case pattern for formats and more formats will be added over time.
**Example:**
```typescript
// types.ts
export interface FormatHandler {
  parse(content: string, language?: string): Record<string, string>;
  parseMultiLanguage(content: string): Record<string, Record<string, string>>;
  serialize(tokens: TokenData[], language: string, options?: SerializeOptions): string;
  serializeMultiLanguage(tokens: TokenData[], languages: string[], options?: SerializeOptions): string;
}

export type SupportedImportFormat = 'json' | 'csv' | 'yaml' | 'xliff' | 'po';
export type SupportedExportFormat = 'json' | 'csv' | 'yaml' | 'xliff' | 'po';

// index.ts - Format registry
const formatHandlers: Record<string, FormatHandler> = {
  json: new JsonFormatHandler(),
  csv: new CsvFormatHandler(),
  yaml: new YamlFormatHandler(),
  xliff: new XliffFormatHandler(),
  po: new GettextFormatHandler(),
};

export function getFormatHandler(format: string): FormatHandler {
  const handler = formatHandlers[format];
  if (!handler) throw new Error(`Unsupported format: ${format}`);
  return handler;
}
```

### Pattern 2: XLIFF Data Mapping
**What:** Map between the platform's flat `{ key: translation }` model and XLIFF's `<trans-unit>` structure.
**When to use:** Parsing and serializing XLIFF files.
**Example:**
```typescript
// XLIFF 1.2 structure:
// <xliff version="1.2">
//   <file source-language="en" target-language="zh-CN">
//     <body>
//       <trans-unit id="greeting.hello">
//         <source>Hello</source>
//         <target>你好</target>
//         <note>Greeting message</note>
//       </trans-unit>
//     </body>
//   </file>
// </xliff>

// Parsing: trans-unit id -> key, target -> translation value
// Serializing: key -> trans-unit id, source lang value -> source, target lang value -> target
```

### Pattern 3: Gettext .po Data Mapping
**What:** Map between flat key-value model and .po `msgid`/`msgstr` pairs.
**When to use:** Parsing and serializing Gettext .po files.
**Example:**
```
# .po file structure:
# Header with metadata (Content-Type, Language, etc.)
#
# #. Developer comment
# #: file.ts:42
# msgctxt "context"
# msgid "Hello"
# msgstr "你好"

# Parsing: msgid -> key (or msgctxt.msgid if context exists), msgstr -> translation
# Serializing: key -> msgid, translation -> msgstr
# Special: empty msgid is the header entry, skip it for translation data
```

### Anti-Patterns to Avoid
- **Regex-based XML parsing for XLIFF:** The current `parseXML` and `parseXMLMultiLanguage` in `importFrom.ts` use regex. This works for the current simple XML format but will fail for XLIFF's complex nested structure (attributes, namespaces, CDATA). Use a proper XML parser or the `xliff` library.
- **Monolithic parser functions:** The current `importFrom.ts` and `exportTo.ts` are single files with all formats. As we add XLIFF and Gettext, this becomes unwieldy. Extract each format into its own module.
- **Losing XLIFF metadata on round-trip:** XLIFF files carry notes, states (translated/signed-off/etc.), and alternative translations. Importing should extract translations; exporting should set appropriate states. Don't silently drop metadata that professional translators depend on.
- **Ignoring Gettext plural forms:** .po files support plural forms (`msgid_plural` + `msgstr[0]`, `msgstr[1]`, etc.). For v1, we can import only the singular form and note this limitation. Do not silently corrupt plural entries.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| XLIFF parsing | Custom XML regex parser | `xliff` npm package | XLIFF has namespaces, attributes, nested groups, inline elements (`<g>`, `<x/>`), and two major versions (1.2, 2.0). Custom parser will miss edge cases. |
| Gettext .po parsing | Line-by-line string splitting | `gettext-parser` | .po files have multiline strings (concatenated with `""`), escape sequences, plural forms, context entries, and a header block. Library handles all of these. |
| YAML parsing (improvement) | Current hand-rolled parser | `js-yaml` | Current parser breaks on colons in values, nested structures > 2 levels, anchors/aliases, flow sequences. js-yaml is the Node.js standard. |
| ZIP generation | Custom archiver | `jszip` (already installed) | Already in use. No change needed. |

**Key insight:** The current hand-rolled parsers for XML and YAML in `importFrom.ts` are fragile and will cause user-facing bugs with real-world translation files. Phase 6 is the right time to replace them with proper libraries while also adding the new formats.

## Common Pitfalls

### Pitfall 1: XLIFF Version Confusion
**What goes wrong:** XLIFF 1.2 and XLIFF 2.0 have different XML structures. A parser built for one version silently produces wrong results for the other.
**Why it happens:** Both are called "XLIFF" but have incompatible schemas. 1.2 uses `<trans-unit>`, 2.0 uses `<unit>/<segment>`.
**How to avoid:** The `xliff` npm package handles both versions. Detect version from the `version` attribute on the `<xliff>` root element. Default to 1.2 (more widely used by translation tools like SDL Trados, MemoQ, OmegaT).
**Warning signs:** Import preview shows zero translations from a valid XLIFF file.

### Pitfall 2: Character Encoding Issues
**What goes wrong:** Files uploaded in non-UTF-8 encodings (Windows-1252, Shift-JIS, GB2312) produce garbled translations.
**Why it happens:** The frontend's `FileReader.readAsArrayBuffer` + `TextDecoder('utf-8')` assumes UTF-8. Many translation files from older tools use legacy encodings.
**How to avoid:** For v1, document that UTF-8 is required. Add a BOM detection check. The Gettext .po header contains a `Content-Type: text/plain; charset=UTF-8` field -- validate it matches. Consider adding encoding detection library (`chardet`) in v2.
**Warning signs:** Imported translations contain replacement characters or mojibake.

### Pitfall 3: Key Collision on Import
**What goes wrong:** XLIFF uses `<trans-unit id="...">` where the ID may not match the platform's dot-notation key convention. Gettext uses `msgid` as the source string, which may contain spaces and special characters.
**Why it happens:** Different formats have different conventions for what constitutes a "key."
**How to avoid:** Define a clear key-mapping strategy per format. For XLIFF: use `resname` attribute if present (translation key), fall back to `id`. For Gettext: use `msgctxt` if present (acts as namespace/key), otherwise use `msgid` directly. Document the mapping in import UI.
**Warning signs:** Imported keys look like "segment-1", "segment-2" instead of meaningful translation keys.

### Pitfall 4: Large File Import Timeout
**What goes wrong:** Importing a file with 10,000+ translation entries takes too long, browser connection times out, or server runs out of memory.
**Why it happens:** The current `importProjectTokens` processes entries one-by-one in batches of 50 within MongoDB transactions. For PostgreSQL with Drizzle, the transaction model is different.
**How to avoid:** Keep the batch processing pattern (already exists). For the preview endpoint, limit the response to first N entries (e.g., 500) with a "and X more..." indicator. Use streaming for very large files. Set appropriate request body size limits (default NestJS limit is 100KB -- increase to 10MB for import).
**Warning signs:** Import works for small files but fails silently or times out for production-sized files.

### Pitfall 5: Export Format Inconsistency with Import
**What goes wrong:** Exporting a file and re-importing it produces different results (keys renamed, metadata lost, structure changed).
**Why it happens:** Export and import code paths are developed separately, using different key-flattening/nesting logic.
**How to avoid:** Write round-trip tests: export -> import -> compare. The test should verify that `import(export(data)) == data` for each format. This catches serializer/parser mismatches early.
**Warning signs:** Users report that re-importing their own exports creates duplicate keys or overwrites wrong translations.

### Pitfall 6: Gettext .po Plural Forms
**What goes wrong:** Importing a .po file with plural forms silently drops the plural translations, or worse, corrupts the singular form.
**Why it happens:** The platform's data model stores `Record<string, string>` (key -> single string value). Gettext plural forms require `Record<string, string[]>` (key -> array of forms).
**How to avoid:** For v1, import only `msgstr[0]` (singular/default form) from plural entries. Log a warning about skipped plural forms. Document this limitation. Consider plural support as v2 enhancement.
**Warning signs:** Users importing .po files with plurals report missing translations.

## Code Examples

### XLIFF 1.2 Parsing
```typescript
// Using xliff npm package
import xliff from 'xliff';

async function parseXliff(content: string): Promise<Record<string, Record<string, string>>> {
  // xliff.xliff12ToJs parses XLIFF 1.2 to JS object
  const parsed = await xliff.xliff12ToJs(content);

  const result: Record<string, Record<string, string>> = {};

  // parsed.resources is { [namespace]: { [key]: { source, target } } }
  for (const [namespace, units] of Object.entries(parsed.resources)) {
    for (const [key, unit] of Object.entries(units as Record<string, any>)) {
      const sourceLang = parsed.sourceLanguage;
      const targetLang = parsed.targetLanguage;

      if (sourceLang && unit.source) {
        if (!result[sourceLang]) result[sourceLang] = {};
        result[sourceLang][key] = String(unit.source);
      }
      if (targetLang && unit.target) {
        if (!result[targetLang]) result[targetLang] = {};
        result[targetLang][key] = String(unit.target);
      }
    }
  }

  return result;
}
```

### XLIFF 1.2 Serialization
```typescript
import xliff from 'xliff';

async function serializeXliff(
  tokens: Array<{ key: string; translations: Record<string, string> }>,
  sourceLanguage: string,
  targetLanguage: string,
): Promise<string> {
  const resources: Record<string, Record<string, { source: string; target: string }>> = {
    namespace: {},
  };

  for (const token of tokens) {
    resources.namespace[token.key] = {
      source: token.translations[sourceLanguage] || '',
      target: token.translations[targetLanguage] || '',
    };
  }

  const jsObj = {
    resources,
    sourceLanguage,
    targetLanguage,
  };

  return xliff.jsToXliff12(jsObj);
}
```

### Gettext .po Parsing
```typescript
import * as gettextParser from 'gettext-parser';

function parsePo(content: string): Record<string, Record<string, string>> {
  const parsed = gettextParser.po.parse(content);
  const result: Record<string, Record<string, string>> = {};

  // Get target language from header
  const headers = parsed.headers || {};
  const language = headers['Language'] || 'unknown';

  if (!result[language]) result[language] = {};

  // parsed.translations is { [context]: { [msgid]: { msgstr: string[] } } }
  for (const [context, entries] of Object.entries(parsed.translations)) {
    for (const [msgid, entry] of Object.entries(entries)) {
      if (!msgid) continue; // Skip empty msgid (header entry)

      // Build key: use context.msgid if context exists, otherwise just msgid
      const key = context ? `${context}.${msgid}` : msgid;

      // msgstr[0] is the singular translation
      const translation = entry.msgstr?.[0] || '';
      if (translation) {
        result[language][key] = translation;
      }
    }
  }

  return result;
}
```

### Gettext .po Serialization
```typescript
import * as gettextParser from 'gettext-parser';

function serializePo(
  tokens: Array<{ key: string; translations: Record<string, string> }>,
  language: string,
): string {
  const data = {
    headers: {
      'Content-Type': 'text/plain; charset=UTF-8',
      'Content-Transfer-Encoding': '8bit',
      'Language': language,
      'MIME-Version': '1.0',
    },
    translations: {
      '': {} as Record<string, any>,
    },
  };

  // Add header entry
  data.translations[''][''] = {
    msgid: '',
    msgstr: [
      `Content-Type: text/plain; charset=UTF-8\n` +
      `Content-Transfer-Encoding: 8bit\n` +
      `Language: ${language}\n` +
      `MIME-Version: 1.0\n`,
    ],
  };

  // Add translation entries
  for (const token of tokens) {
    const value = token.translations[language] || '';
    data.translations[''][token.key] = {
      msgid: token.key,
      msgstr: [value],
    };
  }

  return gettextParser.po.compile(data).toString('utf-8');
}
```

### Round-Trip Test Pattern
```typescript
// Verify export -> import produces the same data
describe('Round-trip tests', () => {
  const testTokens = [
    { key: 'greeting.hello', translations: { en: 'Hello', 'zh-CN': '你好' } },
    { key: 'greeting.goodbye', translations: { en: 'Goodbye', 'zh-CN': '再见' } },
  ];

  for (const format of ['json', 'yaml', 'csv', 'xliff', 'po']) {
    it(`round-trips through ${format}`, async () => {
      const exported = serialize(testTokens, 'en', format);
      const imported = parse(exported, format);

      for (const token of testTokens) {
        expect(imported[token.key]).toBeDefined();
        expect(imported[token.key]).toBe(token.translations.en);
      }
    });
  }
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| XLIFF 1.2 only | XLIFF 1.2 + 2.0 support | XLIFF 2.0 finalized in 2014, adoption growing since 2020 | Should parse both versions, serialize as 1.2 (broader tool support) |
| .po files only | .po + .mo support via gettext-parser | Stable | .mo is binary compiled format. Only .po (text) needed for import. |
| Hand-rolled YAML parser | js-yaml library | Always | Current hand-rolled parser has known edge-case failures |
| Regex XML parsing | DOM/SAX parsing via libraries | Always | Regex XML parsing breaks on namespaces, CDATA, attributes |

**Deprecated/outdated:**
- XLIFF 1.0: Superseded by 1.2. No need to support.
- Custom XML format (current `exportToXML`): This is a proprietary format, not XLIFF. Keep for backward compatibility but label it "Custom XML" in the UI, not to be confused with XLIFF.

## Open Questions

1. **Source language for XLIFF export**
   - What we know: XLIFF requires both source and target language. The platform stores per-key `{ lang: value }` but doesn't designate a "source" language.
   - What's unclear: Which language should be treated as `<source>` in XLIFF exports?
   - Recommendation: Add a "source language" project setting (defaults to first language in list, typically `en`). For now, use the first project language as source. The XLIFF export UI should let the user pick source and target languages.

2. **Gettext key strategy**
   - What we know: Gettext traditionally uses the source string itself as `msgid` (e.g., `msgid "Hello, World!"`). The platform uses developer-defined keys like `greeting.hello`.
   - What's unclear: Should export use the key or the source-language translation as `msgid`?
   - Recommendation: Use the platform key as `msgid` (more compatible with developer workflows). This is what Tolgee and Traduora do. Professional translators using .po will see the key, not the source text -- document this behavior.

3. **Multi-language import from single file**
   - What we know: The current import UI requires selecting a single target language. XLIFF and CSV can contain multiple languages in one file.
   - What's unclear: Should we support importing multiple languages at once?
   - Recommendation: For XLIFF, import both source and target languages from the file (they're explicit in the XML). For CSV, the existing multi-language parser already handles this. Update the UI to auto-detect languages from the file when format is XLIFF or CSV.

## Sources

### Primary (HIGH confidence)
- Codebase inspection: `packages/server/src/utils/exportTo.ts`, `importFrom.ts`, `project.service.ts`, `project.controller.ts`, `ProjectImportTab.tsx`, `ProjectExportTab.tsx` -- complete existing import/export system analyzed
- OASIS XLIFF 1.2 specification -- trans-unit structure, source/target elements
- Gettext manual -- .po file format specification, msgid/msgstr/msgctxt syntax

### Secondary (MEDIUM confidence)
- npm package `xliff` -- API for xliff12ToJs/jsToXliff12 functions (based on package documentation)
- npm package `gettext-parser` -- API for po.parse/po.compile (based on package documentation)
- npm package `js-yaml` -- YAML parsing/serialization API (widely used, well-documented)

### Tertiary (LOW confidence)
- Community patterns for XLIFF source language handling in TMS platforms (inferred from Tolgee/Weblate behavior)
- Gettext msgid-as-key vs msgid-as-source-text debate (community convention varies)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Libraries are well-established npm packages with high download counts and TypeScript support
- Architecture: HIGH - Extending existing pattern (switch-case per format) with format handler registry is straightforward
- Pitfalls: HIGH - Based on direct codebase inspection of current parser limitations and real-world XLIFF/Gettext edge cases
- Code examples: MEDIUM - Based on library documentation; actual API signatures should be verified against installed versions

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable domain, format specs don't change)
