import { PartialType } from "@nestjs/mapped-types";
import { CreateOperatingCycleDto } from "./create-operating-cycle.dto";

export class UpdateOperatingCycleDto extends PartialType(
  CreateOperatingCycleDto,
) {}