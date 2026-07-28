import { IsEnum, IsUUID } from "class-validator";
import { SchemeGovernanceRoleType } from "../../enums/governance.enums";

export class AssignRoleDto {
  @IsUUID()
  tenantUserId!: string;

  @IsEnum(SchemeGovernanceRoleType)
  roleType!: SchemeGovernanceRoleType;
}
