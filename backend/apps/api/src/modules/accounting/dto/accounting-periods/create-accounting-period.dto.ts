import { IsDateString, IsString, MaxLength } from "class-validator";

export class CreateAccountingPeriodDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsDateString()
  startsOn!: string;

  @IsDateString()
  endsOn!: string;
}