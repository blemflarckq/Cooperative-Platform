import { IsOptional, IsUUID } from "class-validator";

export class UpdateAccountingSettingsDto {
  @IsOptional()
  @IsUUID()
  cashAccountId?: string | null;

  @IsOptional()
  @IsUUID()
  memberSavingsLiabilityAccountId?: string | null;

  @IsOptional()
  @IsUUID()
  loanReceivableAccountId?: string | null;

  @IsOptional()
  @IsUUID()
  interestIncomeAccountId?: string | null;

  @IsOptional()
  @IsUUID()
  penaltyIncomeAccountId?: string | null;
}