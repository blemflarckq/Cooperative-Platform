import { Type } from "class-transformer";
import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from "class-validator";

export class LoanAllocationLineDto {
  @IsUUID()
  loanId!: string;

  @IsString()
  amount!: string;
}

export class RemainderAllocationDto {
  @IsUUID()
  cycleId!: string;

  @IsString()
  amount!: string;
}

export class AllocatePaymentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LoanAllocationLineDto)
  loanAllocations!: LoanAllocationLineDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => RemainderAllocationDto)
  remainder?: RemainderAllocationDto;
}
