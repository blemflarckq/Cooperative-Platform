import { IsEnum, IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "../../../../common/dto/pagination-query.dto";
import { OperatingCycleStatus } from "../../enums/scheme.enums";

export class ListOperatingCyclesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(OperatingCycleStatus)
  status?: OperatingCycleStatus;
}