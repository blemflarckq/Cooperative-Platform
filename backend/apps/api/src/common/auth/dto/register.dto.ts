import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

export class RegisterDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  firstName!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  lastName!: string;

  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(30)
  mobile!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password!: string;
}
