import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import { ContributionSource } from "../../enums/contribution.enums";

export class CreateContributionDto {
  @IsUUID()
  tenantUserId!: string;

  @IsDateString()
  contributionDate!: string;

  /**
   * Kept as string for decimal precision and consistency with numeric DB fields.
   */
  @IsString()
  amount!: string;

  @IsOptional()
  @IsEnum(ContributionSource)
  source?: ContributionSource;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}