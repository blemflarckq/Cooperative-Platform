import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/db/base.entity";
import { Loan } from "./loan.entity";
import { TenantUser } from "../../identity/entities/tenant-user.entity";

/**
 * One member's individual pledge toward funding another member's
 * peer-funded loan tranche. Each pledge tracks its own outstanding
 * balance separately — interest earned on a pledge belongs to the
 * pledging member specifically, not to a shared pool, so this can't be
 * collapsed into a single aggregate number on the Loan itself.
 */
@Entity("loan_pledges")
@Index(["loanId", "pledgingTenantUserId"], { unique: true })
export class LoanPledge extends BaseEntity {
  @Column("uuid")
  tenantId!: string;

  @Column("uuid")
  loanId!: string;

  @ManyToOne(() => Loan, (loan) => loan.pledges, { onDelete: "CASCADE" })
  @JoinColumn({ name: "loanId" })
  loan!: Loan;

  @Column("uuid")
  pledgingTenantUserId!: string;

  @ManyToOne(() => TenantUser, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "pledgingTenantUserId" })
  pledgingTenantUser!: TenantUser;

  @Column({ type: "numeric", precision: 18, scale: 2 })
  pledgedAmount!: string;

  @Column({ type: "numeric", precision: 18, scale: 2 })
  outstandingPrincipal!: string;

  @Column({ type: "timestamptz" })
  pledgedAt!: Date;
}
