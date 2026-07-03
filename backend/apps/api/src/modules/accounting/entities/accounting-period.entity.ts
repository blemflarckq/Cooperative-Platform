import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/db/base.entity";
import { Tenant } from "../../identity/entities/tenant.entity";
import { AccountingPeriodStatus } from "../enums/accounting-period.enums";

@Entity("accounting_periods")
@Index(["tenantId", "code"], { unique: true })
@Index(["tenantId", "startsOn", "endsOn"])
export class AccountingPeriod extends BaseEntity {
  @Column("uuid")
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "tenantId" })
  tenant!: Tenant;

  @Column({ type: "varchar", length: 40 })
  code!: string;

  @Column({ type: "varchar", length: 120 })
  name!: string;

  @Column({ type: "date" })
  startsOn!: string;

  @Column({ type: "date" })
  endsOn!: string;

  @Column({ type: "boolean", default: false })
  isClosed!: boolean;

  @Column({
    type: "enum",
    enum: AccountingPeriodStatus,
    default: AccountingPeriodStatus.OPEN,
  })
  status!: AccountingPeriodStatus;

  @Column({ type: "timestamptz", nullable: true })
  closedAt!: Date | null;

  @Column({ type: "uuid", nullable: true })
  closedByUserId!: string | null;
}