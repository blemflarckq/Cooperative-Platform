import { IsNotEmpty, IsString } from "class-validator";

export class OAuthCompleteDto {
  @IsNotEmpty()
  @IsString()
  code!: string;
}
