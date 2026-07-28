import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { ApprovalDecision } from "../../enums/governance.enums";

export class RecordApprovalDto {
  @IsEnum(ApprovalDecision)
  decision!: ApprovalDecision;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
