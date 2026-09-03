import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreateTenantDto {
  @IsNotEmpty()
  @IsString()
  preAuthToken!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(160)
  name!: string;
}
