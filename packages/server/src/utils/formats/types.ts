/**
 * Shared types for format handlers (XLIFF, Gettext, etc.)
 */

/** Token data used by parsers and serializers */
export interface TokenData {
  key: string;
  translations: Record<string, string>;
}

/** Options for serialization */
export interface SerializeOptions {
  prettify?: boolean;
  sourceLanguage?: string;
}

/** Supported import formats */
export type SupportedImportFormat =
  | 'json'
  | 'csv'
  | 'xml'
  | 'yaml'
  | 'xliff'
  | 'po';

/** Supported export formats */
export type SupportedExportFormat =
  | 'json'
  | 'csv'
  | 'xml'
  | 'yaml'
  | 'xliff'
  | 'po';
