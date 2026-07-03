import { IsEnum, IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "../../../../common/dto/pagination-query.dto";
import { SchemeStatus } from "../../enums/scheme.enums";

export class ListSchemesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(SchemeStatus)
  status?: SchemeStatus;
}