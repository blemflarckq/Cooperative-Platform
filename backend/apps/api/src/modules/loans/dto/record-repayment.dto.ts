import { IsString } from "class-validator";

export class RecordRepaymentDto {
  @IsString()
  amount!: string;
}
