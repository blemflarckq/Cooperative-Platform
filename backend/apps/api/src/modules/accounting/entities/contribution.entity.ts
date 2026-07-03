import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from "typeorm";
import { BaseEntity } from "../../../common/db/base.entity";
import { Tenant } from "../../identity/entities/tenant.entity";
import { TenantUser } from "../../identity/entities/tenant-user.entity";
import { OperatingCycle } from "../../schemes/entities/operating-cycle.entity";
import { JournalEntry } from "./journal-entry.entity";
import {
  ContributionSource,
  ContributionStatus,
} from "../enums/contribution.enums";

@Entity("contributions")
@Index(["tenantId", "cycleId"])
@Index(["tenantId", "tenantUserId"])
@Index(["tenantId", "status"])
@Index(["tenantId", "reference"], { unique: true })
export class Contribution extends BaseEntity {
  @Column("uuid")
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "tenantId" })
  tenant!: Tenant;

  @Column("uuid")
  cycleId!: string;

  @ManyToOne(() => OperatingCycle, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "cycleId" })
  cycle!: OperatingCycle;

  @Column("uuid")
  tenantUserId!: string;

  @ManyToOne(() => TenantUser, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "tenantUserId" })
  tenantUser!: TenantUser;

  /**
   * Human/audit-friendly reference, unique per tenant.
   * Example: CONTR-2026-000001
   */
  @Column({ type: "varchar", length: 100 })
  reference!: string;

  @Column({ type: "date" })
  contributionDate!: string;

  @Column({ type: "numeric", precision: 18, scale: 2 })
  amount!: string;

  @Column({
    type: "enum",
    enum: ContributionSource,
    default: ContributionSource.CASH,
  })
  source!: ContributionSource;

  @Column({
    type: "enum",
    enum: ContributionStatus,
    default: ContributionStatus.POSTED,
  })
  status!: ContributionStatus;

  /**
   * Journal entry that posted this contribution into the general ledger.
   */
  @Column("uuid")
  journalEntryId!: string;

  @ManyToOne(() => JournalEntry, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "journalEntryId" })
  journalEntry!: JournalEntry;

  @Column({ type: "text", nullable: true })
  notes!: string | null;

  @Column({ type: "uuid", nullable: true })
  reversedJournalEntryId!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  reversedAt!: Date | null;

  @Column({ type: "uuid", nullable: true })
  reversedByUserId!: string | null;
}