import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/db/base.entity";
import { CooperativeScheme } from "./cooperative-scheme.entity";
import { TenantUser } from "../../identity/entities/tenant-user.entity";
import { SchemeGovernanceRoleType } from "../enums/governance.enums";

/**
 * SchemeRoleAssignment answers "who holds which governance role in which
 * scheme, and since when" — deliberately separate from the platform-wide
 * Role/TenantUserRole system (see identity module).
 *
 * A role is "currently active" when endsAt IS NULL. Handover never deletes
 * a row — it sets endsAt on the outgoing assignment and creates a new row
 * for the incoming holder, so history (and every past approval's context)
 * stays intact even after roles rotate.
 */
@Entity("scheme_role_assignments")
@Index(["tenantId", "schemeId", "roleType"])
export class SchemeRoleAssignment extends BaseEntity {
  @Column("uuid")
  tenantId!: string;

  @Column("uuid")
  schemeId!: string;

  @ManyToOne(() => CooperativeScheme, { onDelete: "CASCADE" })
  @JoinColumn({ name: "schemeId" })
  scheme!: CooperativeScheme;

  @Column("uuid")
  tenantUserId!: string;

  @ManyToOne(() => TenantUser, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "tenantUserId" })
  tenantUser!: TenantUser;

  @Column({ type: "enum", enum: SchemeGovernanceRoleType })
  roleType!: SchemeGovernanceRoleType;

  @Column({ type: "timestamptz" })
  startsAt!: Date;

  /**
   * null while this assignment is active. Set at handover time — never
   * delete a row, so approvals made while this person held the role
   * always resolve to an accurate historical record.
   */
  @Column({ type: "timestamptz", nullable: true })
  endsAt!: Date | null;
}
