import { IsOptional, IsString, Length } from 'class-validator';

/**
 * Names only. Phone number is the person's sign-in and changes only with
 * their own verification; deactivating and reactivating have their own
 * endpoints with their own safeguards. Keeping them out of this DTO means
 * the global ValidationPipe rejects them here, rather than this endpoint
 * quietly becoming a way around those safeguards.
 */
export class UpdateTenantUserDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  lastName?: string;
}
