import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { BaseEntity } from "../../../common/db/base.entity";
import { Tenant } from "../../identity/entities/tenant.entity";
import {
  AccountNormalBalance,
  AccountStatus,
  AccountType,
} from "../enums/account.enums";
import { JournalLine } from "./journal-line.entity";

@Entity("accounts")
@Index(["tenantId", "code"], { unique: true })
@Index(["tenantId", "type"])
export class Account extends BaseEntity {
  @Column("uuid")
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "tenantId" })
  tenant!: Tenant;

  @Column({ type: "varchar", length: 40 })
  code!: string;

  @Column({ type: "varchar", length: 160 })
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({
    type: "enum",
    enum: AccountType,
  })
  type!: AccountType;

  @Column({
    type: "enum",
    enum: AccountNormalBalance,
  })
  normalBalance!: AccountNormalBalance;

  @Column({
    type: "enum",
    enum: AccountStatus,
    default: AccountStatus.ACTIVE,
  })
  status!: AccountStatus;

  @Column({ type: "boolean", default: true })
  isSystem!: boolean;

  @OneToMany(() => JournalLine, (line) => line.account)
  journalLines!: JournalLine[];
}