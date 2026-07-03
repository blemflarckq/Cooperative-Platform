import { IsBooleanString, IsOptional, IsString } from 'class-validator';

export class ListTenantUsersQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsBooleanString()
  isActive?: string;
}