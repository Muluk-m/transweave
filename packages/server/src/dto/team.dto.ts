import { IsString, IsOptional, MaxLength, MinLength, IsIn } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateTeamDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatar?: string;
}

export class InviteMemberDto {
  @IsString()
  userId: string;

  @IsIn(['owner', 'admin', 'member'])
  role: string;
}

export class UpdateMemberRoleDto {
  @IsIn(['owner', 'admin', 'member'])
  role: string;
}
