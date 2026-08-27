import { IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class RecordPaymentDto {
  @IsUUID()
  tenantUserId!: string;

  @IsString()
  amount!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
