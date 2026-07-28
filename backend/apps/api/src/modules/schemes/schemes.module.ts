import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CooperativeScheme } from "./entities/cooperative-scheme.entity";
import { OperatingCycle } from "./entities/operating-cycle.entity";
import { CycleParticipant } from "./entities/cycle-participant.entity";
import { SchemeRoleAssignment } from "./entities/scheme-role-assignment.entity";
import { ApprovalPolicy } from "./entities/approval-policy.entity";
import { OutboundRequest } from "./entities/outbound-request.entity";
import { OutboundRequestApproval } from "./entities/outbound-request-approval.entity";
import { RoleTransitionPetition } from "./entities/role-transition-petition.entity";
import { SchemesController } from "./controllers/schemes.controller";
import { SchemesService } from "./services/schemes.service";
import { SchemesOutboxService } from "./services/schemes-outbox.service";
import { OperatingCyclesService } from "./services/operating-cycles.service";
import { OperatingCyclesController } from "./controllers/operating-cycles.controller";
import { CycleParticipantsService } from "./services/cycle-participants.service";
import { CycleParticipantsController } from "./controllers/cycle-participants.controller";
import { ActorTenantUserResolverService } from "./services/actor-tenant-user-resolver.service";
import { SchemeRoleAssignmentsService } from "./services/scheme-role-assignments.service";
import { SchemeRoleAssignmentsController } from "./controllers/scheme-role-assignments.controller";
import { ApprovalPolicyService } from "./services/approval-policy.service";
import { ApprovalPolicyController } from "./controllers/approval-policy.controller";
import { OutboundRequestsService } from "./services/outbound-requests.service";
import { OutboundRequestsController } from "./controllers/outbound-requests.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CooperativeScheme,
      OperatingCycle,
      CycleParticipant,
      SchemeRoleAssignment,
      ApprovalPolicy,
      OutboundRequest,
      OutboundRequestApproval,
      RoleTransitionPetition,
    ]),
  ],
  providers: [
    SchemesService,
    SchemesOutboxService,
    OperatingCyclesService,
    CycleParticipantsService,
    ActorTenantUserResolverService,
    SchemeRoleAssignmentsService,
    ApprovalPolicyService,
    OutboundRequestsService,
  ],
  controllers: [
    SchemesController,
    OperatingCyclesController,
    CycleParticipantsController,
    SchemeRoleAssignmentsController,
    ApprovalPolicyController,
    OutboundRequestsController,
  ],
  exports: [
    TypeOrmModule,
    SchemesService,
    OperatingCyclesService,
    CycleParticipantsService,
    ActorTenantUserResolverService,
    SchemeRoleAssignmentsService,
    ApprovalPolicyService,
    OutboundRequestsService,
  ],
})
export class SchemesModule {}
