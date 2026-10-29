import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
import { LoanPolicy } from "../entities/loan-policy.entity";
import { CooperativeScheme } from "../../schemes/entities/cooperative-scheme.entity";
import { AtCapBehavior, RateScheduleMode } from "../enums/loan.enums";
import { ActorTenantUserResolverService } from "../../schemes/services/actor-tenant-user-resolver.service";

export interface UpsertLoanPolicyInput {
  selfFundedMonthlyRate: string;
  peerBaseMonthlyRate: string;
  peerMonthlyRateIncrement: string;
  peerCapRate: string;
  atCapBehavior: AtCapBehavior;
  rateScheduleMode?: RateScheduleMode;
  initialPeriodMonths?: number;
  laterPeriodMonths?: number;
  peerLaterMonthlyRate?: string;
}

/**
 * Deliberately conservative, obviously-placeholder numbers — never
 * actually applied to a real loan, since isReviewed stays false until a
 * Treasurer explicitly configures real terms. Picking real rates is a
 * financial/community-trust decision, not something to invent silently;
 * these values exist purely so the draft row is non-null and requestLoan
 * has something concrete to reject against.
 */
const DRAFT_POLICY_DEFAULTS: UpsertLoanPolicyInput = {
  selfFundedMonthlyRate: "1.00",
  peerBaseMonthlyRate: "2.00",
  peerMonthlyRateIncrement: "0.50",
  peerCapRate: "10.00",
  atCapBehavior: AtCapBehavior.CONTINUE_AT_CAP,
};

@Injectable()
export class LoanPolicyService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly actorResolver: ActorTenantUserResolverService,
  ) {}

  async getForScheme(tenantId: string, schemeId: string): Promise<LoanPolicy> {
    const policy = await this.dataSource.getRepository(LoanPolicy).findOne({
      where: { tenantId, schemeId },
    });

    if (!policy) {
      throw new NotFoundException(
        "No loan policy has been configured for this scheme yet.",
      );
    }

    return policy;
  }

  async upsert(
    tenantId: string,
    schemeId: string,
    input: UpsertLoanPolicyInput,
    actorUserId: string,
  ): Promise<LoanPolicy> {
    this.validateInput(input);

    return this.dataSource.transaction(async (manager) => {
      await this.actorResolver.resolve(manager, tenantId, actorUserId);

      const scheme = await manager.findOne(CooperativeScheme, {
        where: { id: schemeId, tenantId },
      });

      if (!scheme) {
        throw new NotFoundException("Scheme not found.");
      }

      let policy = await manager.findOne(LoanPolicy, {
        where: { tenantId, schemeId },
      });

      // The period fields only mean anything in PERIODS mode — switching
      // a scheme back to RAMP clears them rather than leaving stale values
      // that look meaningful but aren't being used.
      const mode = input.rateScheduleMode ?? RateScheduleMode.RAMP;
      const isPeriods = mode === RateScheduleMode.PERIODS;
      const values = {
        ...input,
        rateScheduleMode: mode,
        initialPeriodMonths: isPeriods ? (input.initialPeriodMonths ?? null) : null,
        laterPeriodMonths: isPeriods ? (input.laterPeriodMonths ?? null) : null,
        peerLaterMonthlyRate: isPeriods ? (input.peerLaterMonthlyRate ?? null) : null,
      };

      if (policy) {
        Object.assign(policy, values);
      } else {
        policy = manager.create(LoanPolicy, { tenantId, schemeId, ...values });
      }

      // Explicitly configuring real values via this endpoint IS the
      // review/confirmation action — no separate "confirm" step needed.
      policy.isReviewed = true;

      return manager.save(LoanPolicy, policy);
    });
  }

  private validateInput(input: UpsertLoanPolicyInput): void {
    const rates = [
      ["selfFundedMonthlyRate", input.selfFundedMonthlyRate],
      ["peerBaseMonthlyRate", input.peerBaseMonthlyRate],
      ["peerMonthlyRateIncrement", input.peerMonthlyRateIncrement],
      ["peerCapRate", input.peerCapRate],
    ] as const;

    for (const [name, value] of rates) {
      const numeric = Number(value);
      if (!value || Number.isNaN(numeric) || numeric < 0) {
        throw new BadRequestException(`${name} must be a non-negative number.`);
      }
    }

    if (Number(input.peerBaseMonthlyRate) > Number(input.peerCapRate)) {
      throw new BadRequestException(
        "peerBaseMonthlyRate cannot be greater than peerCapRate.",
      );
    }

    if ((input.rateScheduleMode ?? RateScheduleMode.RAMP) === RateScheduleMode.PERIODS) {
      for (const [name, value] of [
        ["initialPeriodMonths", input.initialPeriodMonths],
        ["laterPeriodMonths", input.laterPeriodMonths],
      ] as const) {
        if (!Number.isInteger(value) || (value as number) < 1) {
          throw new BadRequestException(`${name} must be a whole number of months, at least 1.`);
        }
      }

      const later = Number(input.peerLaterMonthlyRate);
      if (!input.peerLaterMonthlyRate || Number.isNaN(later) || later < 0) {
        throw new BadRequestException("peerLaterMonthlyRate must be a non-negative number.");
      }

      // A schedule that gets cheaper as a loan ages is almost certainly a
      // typo (rates swapped), and "escalation" means it shouldn't.
      if (!(Number(input.peerBaseMonthlyRate) <= later && later <= Number(input.peerCapRate))) {
        throw new BadRequestException(
          "Rates should rise as a loan ages: the initial rate, then the later rate, then the cut-off rate — each at least as high as the one before.",
        );
      }
    }
  }
}

/**
 * Standalone (no DI) so schemes.service.ts can call this directly at
 * scheme activation without SchemesModule needing to depend on
 * LoansModule — which would be circular, since LoansModule already
 * depends on SchemesModule. Same idempotent draft-creation logic either
 * way, just callable from both sides without a module-dependency problem.
 */
export async function ensureDraftLoanPolicyForScheme(
  manager: EntityManager,
  tenantId: string,
  schemeId: string,
): Promise<LoanPolicy | null> {
  const existing = await manager.findOne(LoanPolicy, {
    where: { tenantId, schemeId },
  });

  if (existing) {
    return existing;
  }

  const policy = manager.create(LoanPolicy, {
    tenantId,
    schemeId,
    ...DRAFT_POLICY_DEFAULTS,
    isReviewed: false,
  });

  return manager.save(LoanPolicy, policy);
}
