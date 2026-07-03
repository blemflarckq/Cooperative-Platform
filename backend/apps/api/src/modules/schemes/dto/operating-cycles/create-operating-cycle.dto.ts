import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
  IsNumberString,
} from "class-validator";

export class CreateOperatingCycleDto {
  @IsString()
  @MaxLength(160)
  name!: string;

  @IsString()
  @MaxLength(80)
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  startsOn?: string;

  @IsOptional()
  @IsDateString()
  endsOn?: string;

  @IsOptional()
  @IsString()
  targetAmount?: string;
}