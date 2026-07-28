import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { LoanPolicy } from "../entities/loan-policy.entity";
import { CooperativeScheme } from "../../schemes/entities/cooperative-scheme.entity";
import { AtCapBehavior } from "../enums/loan.enums";
import { ActorTenantUserResolverService } from "../../schemes/services/actor-tenant-user-resolver.service";

export interface UpsertLoanPolicyInput {
  selfFundedMonthlyRate: string;
  peerBaseMonthlyRate: string;
  peerMonthlyRateIncrement: string;
  peerCapRate: string;
  atCapBehavior: AtCapBehavior;
}

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

      if (policy) {
        Object.assign(policy, input);
      } else {
        policy = manager.create(LoanPolicy, { tenantId, schemeId, ...input });
      }

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
  }
}
