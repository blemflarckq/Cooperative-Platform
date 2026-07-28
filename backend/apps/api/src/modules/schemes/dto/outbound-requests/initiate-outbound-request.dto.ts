import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { OutboundRequestType } from "../../enums/governance.enums";

export class InitiateOutboundRequestDto {
  @IsEnum(OutboundRequestType)
  requestType!: OutboundRequestType;

  /**
   * Kept as string for decimal precision, consistent with amount fields
   * elsewhere in the codebase (see contributions, journal lines).
   */
  @IsString()
  amount!: string;

  @IsString()
  purpose!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  sourceReference?: string;
}
