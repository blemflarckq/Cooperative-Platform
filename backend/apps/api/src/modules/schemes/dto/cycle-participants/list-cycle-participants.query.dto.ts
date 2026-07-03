import { IsEnum, IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "../../../../common/dto/pagination-query.dto";
import { CycleParticipantStatus } from "../../enums/scheme.enums";

export class ListCycleParticipantsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(CycleParticipantStatus)
  status?: CycleParticipantStatus;
}