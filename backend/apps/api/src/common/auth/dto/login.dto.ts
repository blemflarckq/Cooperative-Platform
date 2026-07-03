/* eslint-disable @typescript-eslint/no-unsafe-call */
import { IsEmail, IsString, MinLength, IsNotEmpty } from "class-validator";

export class LoginDto {
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password!: string;

  /**
   * User picks which cooperative/tenant they are logging into.
   */
  @IsNotEmpty()
  @IsString()
  tenantSlug!: string;
}