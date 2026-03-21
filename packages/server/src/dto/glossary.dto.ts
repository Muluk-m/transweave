import { IsString, IsOptional, IsBoolean, IsObject, IsArray, IsIn } from 'class-validator';

export class CreateGlossaryDto {
  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsString()
  sourceTerm: string;

  @IsObject()
  translations: Record<string, string>;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  caseSensitive?: boolean;

  @IsOptional()
  @IsBoolean()
  doNotTranslate?: boolean;
}

export class UpdateGlossaryDto {
  @IsOptional()
  @IsString()
  sourceTerm?: string;

  @IsOptional()
  @IsObject()
  translations?: Record<string, string>;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  caseSensitive?: boolean;

  @IsOptional()
  @IsBoolean()
  doNotTranslate?: boolean;
}

export class ImportGlossaryDto {
  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsArray()
  entries: Array<{
    sourceTerm: string;
    translations: Record<string, string>;
    description?: string;
    caseSensitive?: boolean;
    doNotTranslate?: boolean;
  }>;
}
