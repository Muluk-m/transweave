/**
 * Format Registry
 *
 * Unified interface for all import/export format handlers.
 * Re-exports individual parser and serializer functions and provides
 * format lookup utilities.
 */

// Re-export all parser and serializer functions
export { parseXliff, parseXliffMultiLanguage } from './xliff.parser';
export {
  serializeXliff,
  createSingleLanguageXliff,
} from './xliff.serializer';
export { parsePo, parsePoMultiLanguage } from './gettext.parser';
export { serializePo, createSingleLanguagePo } from './gettext.serializer';

// Re-export types
export type {
  TokenData,
  SerializeOptions,
  SupportedImportFormat,
  SupportedExportFormat,
} from './types';

/** All formats supported for import */
export const SUPPORTED_IMPORT_FORMATS = [
  'json',
  'csv',
  'xml',
  'yaml',
  'xliff',
  'po',
] as const;

/** All formats supported for export */
export const SUPPORTED_EXPORT_FORMATS = [
  'json',
  'csv',
  'xml',
  'yaml',
  'xliff',
  'po',
] as const;
