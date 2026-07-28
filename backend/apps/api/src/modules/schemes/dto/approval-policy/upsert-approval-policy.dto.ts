import { ArrayMinSize, IsEnum, IsInt, Min } from "class-validator";
import { SchemeGovernanceRoleType } from "../../enums/governance.enums";

export class UpsertApprovalPolicyDto {
  @ArrayMinSize(1)
  @IsEnum(SchemeGovernanceRoleType, { each: true })
  eligibleRoleTypes!: SchemeGovernanceRoleType[];

  @IsInt()
  @Min(1)
  requiredApprovals!: number;
}
