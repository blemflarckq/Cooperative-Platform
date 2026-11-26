import { Transform } from "class-transformer";
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import {
  ContributionMode,
  CycleMode,
  LoanMode,
  PayoutMode,
} from "../../enums/scheme.enums";

export class CreateSchemeDto {
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: "A scheme needs a name." })
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
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