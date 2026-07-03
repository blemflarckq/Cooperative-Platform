import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CooperativeScheme } from "./entities/cooperative-scheme.entity";
import { OperatingCycle } from "./entities/operating-cycle.entity";
import { CycleParticipant } from "./entities/cycle-participant.entity";
import { SchemesController } from "./controllers/schemes.controller";
import { SchemesService } from "./services/schemes.service";
import { SchemesOutboxService } from "./services/schemes-outbox.service";
import { OperatingCyclesService } from "./services/operating-cycles.service";
import { OperatingCyclesController } from "./controllers/operating-cycles.controller";
import { CycleParticipantsService } from "./services/cycle-participants.service";
import { CycleParticipantsController } from "./controllers/cycle-participants.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CooperativeScheme,
      OperatingCycle,
      CycleParticipant,
    ]),
  ],
  providers: [SchemesService, SchemesOutboxService, OperatingCyclesService, CycleParticipantsService],
  controllers: [SchemesController, OperatingCyclesController, CycleParticipantsController],
  exports: [TypeOrmModule, SchemesService, OperatingCyclesService, CycleParticipantsService],
})
export class SchemesModule {}