import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from "typeorm";
import { BaseEntity } from "../../../common/db/base.entity";
import { Tenant } from "../../identity/entities/tenant.entity";
import { Account } from "./account.entity";
import { JournalEntry } from "./journal-entry.entity";
import { JournalLineType } from "../enums/journal.enums";

@Entity("journal_lines")
@Index(["tenantId", "journalEntryId"])
@Index(["tenantId", "accountId"])
export class JournalLine extends BaseEntity {
  @Column("uuid")
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "tenantId" })
  tenant!: Tenant;

  @Column("uuid")
  journalEntryId!: string;

  @ManyToOne(() => JournalEntry, (entry) => entry.lines, {
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "journalEntryId" })
  journalEntry!: JournalEntry;

  @Column("uuid")
  accountId!: string;

  @ManyToOne(() => Account, (account) => account.journalLines, {
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "accountId" })
  account!: Account;

  @Column({
    type: "enum",
    enum: JournalLineType,
  })
  lineType!: JournalLineType;

  @Column({ type: "numeric", precision: 18, scale: 2 })
  amount!: string;

  @Column({ type: "text", nullable: true })
  memo!: string | null;
}