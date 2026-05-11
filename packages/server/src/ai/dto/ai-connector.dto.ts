import { IsArray, IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SUPPORTED_PROVIDERS } from '../providers/translation-provider.interface';

export class EnabledModelDto {
  @IsString() @IsNotEmpty() modelId!: string;
  @IsOptional() @IsString() label?: string;
  @IsBoolean() addedManually!: boolean;
}

export class CreateConnectorDto {
  @IsIn(['team', 'project']) scope!: 'team' | 'project';
  @IsUUID() teamId!: string;
  @IsOptional() @IsUUID() projectId?: string;
  @IsString() @IsNotEmpty() @MaxLength(80) displayName!: string;
  @IsIn(SUPPORTED_PROVIDERS as readonly string[]) provider!: string;
  @IsString() @IsNotEmpty() apiKey!: string;
  @IsOptional() @IsString() @MaxLength(500) baseUrl?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => EnabledModelDto) enabledModels!: EnabledModelDto[];
}

export class UpdateConnectorDto {
  @IsOptional() @IsString() @MaxLength(80) displayName?: string;
  @IsOptional() @IsString() apiKey?: string;
  @IsOptional() @IsString() @MaxLength(500) baseUrl?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => EnabledModelDto) enabledModels?: EnabledModelDto[];
}
