import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { ApprovalPolicy } from "../entities/approval-policy.entity";
import { CooperativeScheme } from "../entities/cooperative-scheme.entity";
import { SchemeGovernanceRoleType } from "../enums/governance.enums";
import { ActorTenantUserResolverService } from "./actor-tenant-user-resolver.service";

export interface UpsertApprovalPolicyInput {
  eligibleRoleTypes: SchemeGovernanceRoleType[];
  requiredApprovals: number;
}

@Injectable()
export class ApprovalPolicyService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly actorResolver: ActorTenantUserResolverService,
  ) {}

  async getForScheme(tenantId: string, schemeId: string): Promise<ApprovalPolicy> {
    const policy = await this.dataSource.getRepository(ApprovalPolicy).findOne({
      where: { tenantId, schemeId },
    });

    if (!policy) {
      throw new NotFoundException(
        "No approval policy has been configured for this scheme yet.",
      );
    }

    return policy;
  }

  /**
   * Creates or replaces the approval policy for a scheme. Deliberately a
   * single upsert rather than separate create/update endpoints — a scheme
   * only ever has one active policy, and callers shouldn't need to know
   * whether one already exists.
   */
  async upsert(
    tenantId: string,
    schemeId: string,
    input: UpsertApprovalPolicyInput,
    actorUserId: string,
  ): Promise<ApprovalPolicy> {
    this.validateInput(input);

    return this.dataSource.transaction(async (manager) => {
      await this.actorResolver.resolve(manager, tenantId, actorUserId);

      const scheme = await manager.findOne(CooperativeScheme, {
        where: { id: schemeId, tenantId },
      });

      if (!scheme) {
        throw new NotFoundException("Scheme not found.");
      }

      let policy = await manager.findOne(ApprovalPolicy, {
        where: { tenantId, schemeId },
      });

      if (policy) {
        policy.eligibleRoleTypes = input.eligibleRoleTypes;
        policy.requiredApprovals = input.requiredApprovals;
      } else {
        policy = manager.create(ApprovalPolicy, {
          tenantId,
          schemeId,
          eligibleRoleTypes: input.eligibleRoleTypes,
          requiredApprovals: input.requiredApprovals,
        });
      }

      return manager.save(ApprovalPolicy, policy);
    });
  }

  private validateInput(input: UpsertApprovalPolicyInput): void {
    if (!input.eligibleRoleTypes || input.eligibleRoleTypes.length === 0) {
      throw new BadRequestException(
        "At least one eligible role type is required.",
      );
    }

    if (!Number.isInteger(input.requiredApprovals) || input.requiredApprovals < 1) {
      throw new BadRequestException(
        "requiredApprovals must be a whole number of at least 1.",
      );
    }
  }
}
