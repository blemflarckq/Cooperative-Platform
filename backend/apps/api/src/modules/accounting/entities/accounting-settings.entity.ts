import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/db/base.entity";
import { Tenant } from "../../identity/entities/tenant.entity";
import { Account } from "./account.entity";

@Entity("accounting_settings")
@Index(["tenantId"], { unique: true })
export class AccountingSettings extends BaseEntity {
  @Column("uuid")
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "tenantId" })
  tenant!: Tenant;

  /**
   * Asset account used when money enters/leaves the cooperative.
   * Example: bank account, cash box, mobile money wallet.
   */
  @Column("uuid", { nullable: true })
  cashAccountId!: string | null;

  @ManyToOne(() => Account, { onDelete: "RESTRICT", nullable: true })
  @JoinColumn({ name: "cashAccountId" })
  cashAccount!: Account | null;

  /**
   * Liability account representing money owed back to members.
   * Member savings are not income. They are cooperative liabilities.
   */
  @Column("uuid", { nullable: true })
  memberSavingsLiabilityAccountId!: string | null;

  @ManyToOne(() => Account, { onDelete: "RESTRICT", nullable: true })
  @JoinColumn({ name: "memberSavingsLiabilityAccountId" })
  memberSavingsLiabilityAccount!: Account | null;

  /**
   * Asset account representing loans owed back to the cooperative.
   */
  @Column("uuid", { nullable: true })
  loanReceivableAccountId!: string | null;

  @ManyToOne(() => Account, { onDelete: "RESTRICT", nullable: true })
  @JoinColumn({ name: "loanReceivableAccountId" })
  loanReceivableAccount!: Account | null;

  /**
   * Income account for interest earned on loans.
   */
  @Column("uuid", { nullable: true })
  interestIncomeAccountId!: string | null;

  @ManyToOne(() => Account, { onDelete: "RESTRICT", nullable: true })
  @JoinColumn({ name: "interestIncomeAccountId" })
  interestIncomeAccount!: Account | null;

  /**
   * Income account for penalties, late fees, and administrative charges.
   */
  @Column("uuid", { nullable: true })
  penaltyIncomeAccountId!: string | null;

  @ManyToOne(() => Account, { onDelete: "RESTRICT", nullable: true })
  @JoinColumn({ name: "penaltyIncomeAccountId" })
  penaltyIncomeAccount!: Account | null;

  /**
   * Whether closed accounting periods actually block posting.
   *
   * Defaults to false — closing a period is still fully supported (the
   * whole AccountingPeriod mechanism stays intact for cooperatives that
   * need real month-end/year-end closing discipline), but a closed period
   * won't silently reject a pilot Treasurer's posting unless this tenant
   * has deliberately opted into strict enforcement. This is the
   * "expose it for professionals, not by default for a lightweight pilot"
   * pattern applied to accounting periods specifically.
   */
  @Column({ type: "boolean", default: false })
  strictPeriodEnforcement!: boolean;
}