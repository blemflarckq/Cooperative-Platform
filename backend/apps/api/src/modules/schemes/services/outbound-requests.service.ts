import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
import { OutboundRequest } from "../entities/outbound-request.entity";
import { OutboundRequestApproval } from "../entities/outbound-request-approval.entity";
import { ApprovalPolicy } from "../entities/approval-policy.entity";
import { CooperativeScheme } from "../entities/cooperative-scheme.entity";
import {
  ApprovalDecision,
  OutboundRequestStatus,
  OutboundRequestType,
} from "../enums/governance.enums";
import { assertPositiveMoneyString } from "../../../common/validation/money";
import { ActorTenantUserResolverService } from "./actor-tenant-user-resolver.service";
import { SchemeRoleAssignmentsService } from "./scheme-role-assignments.service";
import {
  assertCanRecordApproval,
  resolveOutboundRequestStatus,
} from "./outbound-request-workflow";

export interface InitiateOutboundRequestInput {
  requestType: OutboundRequestType;
  amount: string;
  purpose: string;
  sourceReference?: string | null;
}

export interface RecordApprovalInput {
  decision: ApprovalDecision;
  comment?: string | null;
}

@Injectable()
export class OutboundRequestsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly actorResolver: ActorTenantUserResolverService,
    private readonly roleAssignments: SchemeRoleAssignmentsService,
  ) {}

  async findOne(
    tenantId: string,
    schemeId: string,
    requestId: string,
  ): Promise<OutboundRequest> {
    const request = await this.dataSource.getRepository(OutboundRequest).findOne({
      where: { id: requestId, tenantId, schemeId },
      relations: { approvals: { approver: { user: true } }, initiatedBy: { user: true } },
    });

    if (!request) {
      throw new NotFoundException("Outbound request not found.");
    }

    return request;
  }

  async findAllForScheme(
    tenantId: string,
    schemeId: string,
  ): Promise<OutboundRequest[]> {
    return this.dataSource.getRepository(OutboundRequest).find({
      where: { tenantId, schemeId },
      // Deliberately the same depth as findOne() below — every
      // viewer-identity check in the UI (is this my request, have I
      // already decided, who initiated this) depends on these nested
      // .user relations actually being loaded. A shallower list query
      // doesn't just show less data, it silently breaks those checks —
      // exactly what happened here before this fix.
      relations: { approvals: { approver: { user: true } }, initiatedBy: { user: true } },
      order: { createdAt: "DESC" },
    });
  }

  /**
   * Starts a new outbound request. This is the "Initiate" step — it does
   * not move any money and requires no approvals yet. requiredApprovals
   * eligibility is checked later, at approval time, against whatever the
   * scheme's ApprovalPolicy says at that moment (not frozen at initiation
   * time) — this matches how a real committee would work: the rules in
   * effect when a decision is made are the ones that apply.
   */
  async initiate(
    tenantId: string,
    schemeId: string,
    input: InitiateOutboundRequestInput,
    actorUserId: string,
    existingManager?: EntityManager,
  ): Promise<OutboundRequest> {
    const run = async (manager: EntityManager): Promise<OutboundRequest> => {
      const initiator = await this.actorResolver.resolve(
        manager,
        tenantId,
        actorUserId,
      );

      return this.createOutboundRequest(manager, tenantId, schemeId, input, initiator.id);
    };

    if (existingManager) {
      return run(existingManager);
    }

    return this.dataSource.transaction(run);
  }

  /**
   * Same as initiate(), but for callers (like LoansService) who already
   * know exactly which TenantUser should be recorded as the initiator —
   * e.g. a loan's disbursement request must always be attributed to the
   * borrower, regardless of whose action (their own request, or another
   * member's pledge that happened to complete the funding) actually
   * triggered its creation. Using the wrong initiator here would
   * incorrectly block that other person from later approving the request
   * themselves, via the no-self-approval rule.
   */
  async initiateForTenantUser(
    tenantId: string,
    schemeId: string,
    input: InitiateOutboundRequestInput,
    initiatorTenantUserId: string,
    existingManager?: EntityManager,
  ): Promise<OutboundRequest> {
    const run = (manager: EntityManager) =>
      this.createOutboundRequest(manager, tenantId, schemeId, input, initiatorTenantUserId);

    if (existingManager) {
      return run(existingManager);
    }

    return this.dataSource.transaction(run);
  }

  private async createOutboundRequest(
    manager: EntityManager,
    tenantId: string,
    schemeId: string,
    input: InitiateOutboundRequestInput,
    initiatorTenantUserId: string,
  ): Promise<OutboundRequest> {
    assertPositiveMoneyString(input.amount, "amount");

    if (!input.purpose?.trim()) {
      throw new BadRequestException("purpose is required.");
    }

    const scheme = await manager.findOne(CooperativeScheme, {
      where: { id: schemeId, tenantId },
    });

    if (!scheme) {
      throw new NotFoundException("Scheme not found.");
    }

    // A policy must exist before anyone can request money out of a
    // scheme — otherwise there'd be nothing defining who's allowed to
    // approve it.
    const policy = await manager.findOne(ApprovalPolicy, {
      where: { tenantId, schemeId },
    });

    if (!policy) {
      throw new BadRequestException(
        "This scheme has no approval policy configured yet — set one up before requesting a withdrawal.",
      );
    }

    const request = manager.create(OutboundRequest, {
      tenantId,
      schemeId,
      requestType: input.requestType,
      amount: Number(input.amount).toFixed(2),
      purpose: input.purpose.trim(),
      sourceReference: input.sourceReference?.trim() || null,
      initiatedByTenantUserId: initiatorTenantUserId,
    });

    return manager.save(OutboundRequest, request);
  }

  /**
   * Records one approver's decision. This is where assertCanRecordApproval
   * and resolveOutboundRequestStatus (see outbound-request-workflow.ts) do
   * the actual work — this method's job is purely to gather the real data
   * they need and persist the result.
   *
   * The request row is locked for the duration of this transaction
   * (pessimistic write) so two approvers submitting at nearly the same
   * moment can't both read "1 approval so far" and both believe they're
   * the second, decisive approval — the second one to actually commit
   * will correctly see the first one's effect.
   */
  async recordApproval(
    tenantId: string,
    schemeId: string,
    requestId: string,
    input: RecordApprovalInput,
    actorUserId: string,
  ): Promise<OutboundRequest> {
    return this.dataSource.transaction(async (manager) => {
      const approver = await this.actorResolver.resolve(
        manager,
        tenantId,
        actorUserId,
      );

      const request = await manager.findOne(OutboundRequest, {
        where: { id: requestId, tenantId, schemeId },
        lock: { mode: "pessimistic_write" },
      });

      if (!request) {
        throw new NotFoundException("Outbound request not found.");
      }

      const policy = await manager.findOne(ApprovalPolicy, {
        where: { tenantId, schemeId },
      });

      if (!policy) {
        throw new BadRequestException(
          "This scheme has no approval policy configured.",
        );
      }

      const existingApprovals = await manager.find(OutboundRequestApproval, {
        where: { outboundRequestId: requestId },
      });

      const approverCurrentRoleTypes =
        await this.roleAssignments.getActiveRoleTypesForTenantUser(
          tenantId,
          schemeId,
          approver.id,
        );

      assertCanRecordApproval({
        requestStatus: request.status,
        initiatorTenantUserId: request.initiatedByTenantUserId,
        approverTenantUserId: approver.id,
        approverCurrentRoleTypes,
        eligibleRoleTypes: policy.eligibleRoleTypes,
        existingApproverIds: existingApprovals.map((a) => a.approverTenantUserId),
      });

      const newApproval = manager.create(OutboundRequestApproval, {
        outboundRequestId: requestId,
        approverTenantUserId: approver.id,
        decision: input.decision,
        comment: input.comment?.trim() || null,
        decidedAt: new Date(),
      });
      await manager.save(OutboundRequestApproval, newApproval);

      const allDecisions = [...existingApprovals, newApproval].map(
        (a) => a.decision,
      );

      request.status = resolveOutboundRequestStatus({
        decisions: allDecisions,
        requiredApprovals: policy.requiredApprovals,
      });

      await manager.save(OutboundRequest, request);

      // NOTE: when request.status resolves to APPROVED, the actual money
      // movement (posting the journal entry via PostingEngineService) is
      // deliberately NOT wired up yet — that's request-type-specific
      // (a loan disbursement and a project expense debit/credit different
      // accounts) and is the next piece of work, once loans becomes the
      // first real consumer of this engine. Flagging explicitly here
      // rather than leaving it silently incomplete.

      return this.findOne(tenantId, schemeId, requestId);
    });
  }

  /**
   * Marks a fully-approved request as executed once the corresponding
   * money movement has actually been posted elsewhere (e.g. by the loans
   * module calling the posting engine). Deliberately separate from
   * recordApproval — reaching APPROVED and actually moving money are two
   * different events with two different audit trails.
   */
  async markExecuted(
    manager: EntityManager,
    tenantId: string,
    schemeId: string,
    requestId: string,
    journalEntryId: string,
  ): Promise<OutboundRequest> {
    const request = await manager.findOne(OutboundRequest, {
      where: { id: requestId, tenantId, schemeId },
    });

    if (!request) {
      throw new NotFoundException("Outbound request not found.");
    }

    if (request.status !== OutboundRequestStatus.APPROVED) {
      throw new BadRequestException(
        "Only a fully-approved request can be marked executed.",
      );
    }

    request.executedJournalEntryId = journalEntryId;
    request.executedAt = new Date();

    return manager.save(OutboundRequest, request);
  }
}
