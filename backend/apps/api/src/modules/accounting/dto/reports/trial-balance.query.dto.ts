import { IsDateString, IsOptional } from "class-validator";

export class TrialBalanceQueryDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}