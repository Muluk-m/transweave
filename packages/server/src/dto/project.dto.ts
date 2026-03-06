import { IsString, IsOptional, IsArray, MaxLength, IsIn, IsBoolean, IsObject } from 'class-validator';
import type { SupportedExportFormat, SupportedImportFormat } from 'src/utils/formats/types';

const FORMATS = ['json', 'csv', 'xml', 'yaml', 'xliff', 'po'] as const;

export class CreateProjectDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsString()
  teamId: string;

  @IsString()
  @MaxLength(500)
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];
}

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @IsOptional()
  @IsObject()
  languageLabels?: Record<string, string>;

  @IsOptional()
  @IsArray()
  modules?: Array<{ name: string; code: string }>;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  url?: string;
}

export class ExportProjectDto {
  @IsIn(FORMATS)
  format: SupportedExportFormat;

  @IsOptional()
  @IsIn(['all', 'completed', 'incomplete', 'custom'])
  scope?: 'all' | 'completed' | 'incomplete' | 'custom';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @IsOptional()
  @IsBoolean()
  showEmptyTranslations?: boolean;

  @IsOptional()
  @IsBoolean()
  prettify?: boolean;

  @IsOptional()
  @IsBoolean()
  includeMetadata?: boolean;
}

export class ImportProjectDto {
  @IsString()
  language: string;

  @IsString()
  content: string;

  @IsIn(FORMATS)
  format: SupportedImportFormat;

  @IsIn(['append', 'replace'])
  mode: 'append' | 'replace';
}

export class MigrateLanguagesDto {
  @IsObject()
  languageMapping: Record<string, string>;
}
