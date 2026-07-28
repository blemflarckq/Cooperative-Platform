import { IsEnum, IsString } from "class-validator";
import { AtCapBehavior } from "../enums/loan.enums";

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
}
