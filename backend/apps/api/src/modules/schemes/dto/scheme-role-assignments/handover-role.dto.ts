import { IsEnum, IsUUID } from "class-validator";
import { SchemeGovernanceRoleType } from "../../enums/governance.enums";

export class HandoverRoleDto {
  @IsEnum(SchemeGovernanceRoleType)
  roleType!: SchemeGovernanceRoleType;

  @IsUUID()
  fromTenantUserId!: string;

  @IsUUID()
  toTenantUserId!: string;
}
