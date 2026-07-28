import { IsString } from "class-validator";

export class PledgeLoanDto {
  @IsString()
  pledgedAmount!: string;
}
