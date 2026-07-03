import { IsOptional, IsString, MaxLength } from "class-validator";

export class ProvisionDefaultAccountsDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  cashAccountName?: string;
}