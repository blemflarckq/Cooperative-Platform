import { IsOptional, IsString, MaxLength } from "class-validator";

export class ReverseContributionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}