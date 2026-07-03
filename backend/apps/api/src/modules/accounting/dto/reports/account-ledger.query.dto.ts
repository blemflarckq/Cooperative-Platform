import { IsDateString, IsOptional } from "class-validator";

export class AccountLedgerQueryDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}