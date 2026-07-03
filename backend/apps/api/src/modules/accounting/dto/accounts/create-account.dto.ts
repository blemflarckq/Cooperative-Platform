import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import {
  AccountNormalBalance,
  AccountType,
} from "../../enums/account.enums";

export class CreateAccountDto {
  @IsString()
  @MaxLength(40)
  code!: string;

  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(AccountType)
  type!: AccountType;

  @IsEnum(AccountNormalBalance)
  normalBalance!: AccountNormalBalance;
}