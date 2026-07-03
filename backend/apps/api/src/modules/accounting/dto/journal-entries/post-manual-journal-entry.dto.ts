import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { JournalLineType } from "../../enums/journal.enums";

class PostManualJournalLineDto {
  @IsUUID()
  accountId!: string;

  @IsEnum(JournalLineType)
  lineType!: JournalLineType;

  /**
   * Money is accepted as a string because PostgreSQL numeric values are
   * returned as strings by TypeORM. The posting engine performs strict
   * money validation before anything is persisted.
   */
  @IsString()
  amount!: string;

  @IsOptional()
  @IsString()
  memo?: string;
}

export class PostManualJournalEntryDto {
  @IsDateString()
  transactionDate!: string;

  @IsString()
  @MaxLength(500)
  description!: string;

  /**
   * Optional external/admin reference, for example:
   * - receipt number
   * - bank deposit reference
   * - correction note reference
   */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  sourceReference?: string;

  /**
   * A valid journal entry must have at least two lines:
   * one debit side and one credit side.
   */
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => PostManualJournalLineDto)
  lines!: PostManualJournalLineDto[];
}