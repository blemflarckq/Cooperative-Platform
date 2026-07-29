import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import {
  ContributionMode,
  CycleMode,
  LoanMode,
  PayoutMode,
} from "../../enums/scheme.enums";

export class CreateSchemeDto {
  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(CycleMode)
  cycleMode!: CycleMode;

  @IsEnum(ContributionMode)
  contributionMode!: ContributionMode;

  @IsEnum(LoanMode)
  loanMode!: LoanMode;

  @IsEnum(PayoutMode)
  payoutMode!: PayoutMode;
}