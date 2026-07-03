import { IsOptional, IsString } from "class-validator";

export class UpdateCycleParticipantDto {
  @IsOptional()
  @IsString()
  notes?: string;
}