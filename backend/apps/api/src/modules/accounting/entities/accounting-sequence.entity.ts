import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../common/db/base.entity";
import { Tenant } from "../../identity/entities/tenant.entity";

@Entity("accounting_sequences")
@Index(["tenantId", "sequenceKey"], { unique: true })
export class AccountingSequence extends BaseEntity {
  @Column("uuid")
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "tenantId" })
  tenant!: Tenant;

  @Column({ type: "varchar", length: 80 })
  sequenceKey!: string;

  @Column({ type: "int", default: 0 })
  currentValue!: number;
}