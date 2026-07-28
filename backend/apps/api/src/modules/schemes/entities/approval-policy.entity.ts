import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/db/base.entity";
import { CooperativeScheme } from "./cooperative-scheme.entity";
import { SchemeGovernanceRoleType } from "../enums/governance.enums";

/**
 * ApprovalPolicy defines who's eligible to approve outbound money movement
 * for a given scheme. requiredApprovals is fixed at 2 by product decision
 * (no single person, including the Treasurer, can move money out alone) —
 * modeled as a field rather than hardcoded so it's an explicit, visible
 * configuration rather than a buried constant, in case it ever needs to
 * change for a specific scheme.
 *
 * eligibleRoleTypes determines *who* can be one of the two approvers, and
 * is what varies by scheme type: a formal cooperative might require
 * Treasurer + one other; a community-led project might allow any 2 of the
 * committee.
 */
@Entity("approval_policies")
@Index(["tenantId", "schemeId"], { unique: true })
export class ApprovalPolicy extends BaseEntity {
  @Column("uuid")
  tenantId!: string;

  @Column("uuid")
  schemeId!: string;

  @ManyToOne(() => CooperativeScheme, { onDelete: "CASCADE" })
  @JoinColumn({ name: "schemeId" })
  scheme!: CooperativeScheme;

  @Column({
    type: "enum",
    enum: SchemeGovernanceRoleType,
    array: true,
  })
  eligibleRoleTypes!: SchemeGovernanceRoleType[];

  @Column({ type: "int", default: 2 })
  requiredApprovals!: number;
}
