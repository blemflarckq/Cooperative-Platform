import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class UpdateTenantUserDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  lastName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  mobile?: string;

  /**
   * Tenant-specific activation status.
   */
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}