import { IsEnum, IsNotEmpty } from "class-validator";
import { ApprovalDecision } from "../../schemes/enums/governance.enums";

export class RecordEnrollmentDecisionDto {
  @IsNotEmpty()
  @IsEnum(ApprovalDecision)
  decision!: ApprovalDecision;
}
