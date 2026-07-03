import { IsOptional, IsString, IsUUID } from "class-validator";

export class EnrollCycleParticipantDto {
  @IsUUID()
  tenantUserId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}