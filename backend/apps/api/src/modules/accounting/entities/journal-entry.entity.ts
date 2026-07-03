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
  JournalEntryStatus,
  JournalSourceModule,
} from "../enums/journal.enums";
import { JournalLine } from "./journal-line.entity";

@Entity("journal_entries")
@Index(["tenantId", "entryNumber"], { unique: true })
@Index(["tenantId", "status"])
@Index(["tenantId", "transactionDate"])
export class JournalEntry extends BaseEntity {
  @Column("uuid")
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "tenantId" })
  tenant!: Tenant;

  @Column({ type: "varchar", length: 80 })
  entryNumber!: string;

  @Column({ type: "date" })
  transactionDate!: string;

  @Column({ type: "text" })
  description!: string;

  @Column({
    type: "enum",
    enum: JournalEntryStatus,
    default: JournalEntryStatus.DRAFT,
  })
  status!: JournalEntryStatus;

  @Column({
    type: "enum",
    enum: JournalSourceModule,
    default: JournalSourceModule.MANUAL,
  })
  sourceModule!: JournalSourceModule;

  @Column({ type: "varchar", length: 120, nullable: true })
  sourceReference!: string | null;

  @Column({ type: "uuid", nullable: true })
  postedByUserId!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  postedAt!: Date | null;

  @Column({ type: "uuid", nullable: true })
  reversedEntryId!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  reversedAt!: Date | null;

  @Column({ type: "uuid", nullable: true })
  reversedByUserId!: string | null;

  @OneToMany(() => JournalLine, (line) => line.journalEntry, {
    cascade: true,
  })
  lines!: JournalLine[];
}