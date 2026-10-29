import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { AtCapBehavior, RateScheduleMode } from "../enums/loan.enums";

export class UpsertLoanPolicyDto {
  @IsString()
  selfFundedMonthlyRate!: string;

  @IsString()
  peerBaseMonthlyRate!: string;

  @IsString()
  peerMonthlyRateIncrement!: string;

  @IsString()
  peerCapRate!: string;

  @IsEnum(AtCapBehavior)
  atCapBehavior!: AtCapBehavior;

  /** Omitted means RAMP, so existing clients keep working unchanged. */
  @IsOptional()
  @IsEnum(RateScheduleMode)
  rateScheduleMode?: RateScheduleMode;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  initialPeriodMonths?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  laterPeriodMonths?: number;

  @IsOptional()
  @IsString()
  peerLaterMonthlyRate?: string;
}
