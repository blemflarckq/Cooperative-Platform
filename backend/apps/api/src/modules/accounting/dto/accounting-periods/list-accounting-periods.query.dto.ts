import { IsEnum, IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "../../../../common/dto/pagination-query.dto";
import { AccountingPeriodStatus } from "../../enums/accounting-period.enums";

export class ListAccountingPeriodsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(AccountingPeriodStatus)
  status?: AccountingPeriodStatus;
}