import { IsNotEmpty, IsString, IsUUID } from "class-validator";

export class SwitchTenantDto {
  @IsNotEmpty()
  @IsString()
  refreshToken!: string;

  @IsUUID()
  tenantId!: string;
}
