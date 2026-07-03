import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";

export class BulkEnrollCycleParticipantsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID("4", { each: true })
  tenantUserIds!: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}