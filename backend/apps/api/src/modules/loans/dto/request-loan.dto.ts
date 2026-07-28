import { IsString } from "class-validator";

export class RequestLoanDto {
  /**
   * Kept as string for decimal precision, consistent with amount fields
   * elsewhere in the codebase.
   */
  @IsString()
  amount!: string;

  @IsString()
  purpose!: string;
}
