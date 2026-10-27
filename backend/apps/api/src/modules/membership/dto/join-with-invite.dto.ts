import { IsNotEmpty, IsString } from "class-validator";

export class JoinWithInviteDto {
  @IsNotEmpty()
  @IsString()
  preAuthToken!: string;
}
