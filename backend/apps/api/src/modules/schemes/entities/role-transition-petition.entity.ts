import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/db/base.entity";
import { CooperativeScheme } from "./cooperative-scheme.entity";
import { TenantUser } from "../../identity/entities/tenant-user.entity";
import { RoleTransitionPetitionStatus } from "../enums/governance.enums";

/**
 * A lightweight escalation path for contested role handovers. Deliberately
 * minimal for pilot: this creates a flagged case for the platform owner to
 * review manually, not an automated arbitration system — see the roadmap
 * for why that's the right scope for now.
 */
@Entity("role_transition_petitions")
export class RoleTransitionPetition extends BaseEntity {
  @Column("uuid")
  tenantId!: string;

  @Column("uuid")
  schemeId!: string;

  @ManyToOne(() => CooperativeScheme, { onDelete: "CASCADE" })
  @JoinColumn({ name: "schemeId" })
  scheme!: CooperativeScheme;

  @Column("uuid")
  raisedByTenantUserId!: string;

  @ManyToOne(() => TenantUser, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "raisedByTenantUserId" })
  raisedBy!: TenantUser;

  @Column({ type: "text" })
  description!: string;

  @Column({
    type: "enum",
    enum: RoleTransitionPetitionStatus,
    default: RoleTransitionPetitionStatus.OPEN,
  })
  status!: RoleTransitionPetitionStatus;

  @Column({ type: "uuid", nullable: true })
  resolvedByUserId!: string | null;

  @Column({ type: "text", nullable: true })
  resolutionNotes!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  resolvedAt!: Date | null;
}
