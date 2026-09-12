import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class SetMobileDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(30)
  mobile!: string;
}
