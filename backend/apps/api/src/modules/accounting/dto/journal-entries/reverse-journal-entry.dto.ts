import { IsOptional, IsString, MaxLength } from "class-validator";

export class ReverseJournalEntryDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}