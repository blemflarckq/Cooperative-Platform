import { IsNotEmpty, IsString, IsUUID } from "class-validator";

export class SelectTenantDto {
  @IsNotEmpty()
  @IsString()
  preAuthToken!: string;

  @IsUUID()
  tenantId!: string;
}
