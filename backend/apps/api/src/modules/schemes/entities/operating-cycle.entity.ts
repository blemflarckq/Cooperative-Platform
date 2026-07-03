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
import { CooperativeScheme } from "./cooperative-scheme.entity";
import { CycleParticipant } from "./cycle-participant.entity";
import { OperatingCycleStatus } from "../enums/scheme.enums";

@Entity("operating_cycles")
@Index(["tenantId", "schemeId", "code"], { unique: true })
@Index(["tenantId", "status"])
export class OperatingCycle extends BaseEntity {
  @Column("uuid")
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "tenantId" })
  tenant!: Tenant;

  @Column("uuid")
  schemeId!: string;

  @ManyToOne(() => CooperativeScheme, (scheme) => scheme.cycles, {
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "schemeId" })
  scheme!: CooperativeScheme;

  @Column({ type: "varchar", length: 160 })
  name!: string;

  @Column({ type: "varchar", length: 80 })
  code!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({
    type: "enum",
    enum: OperatingCycleStatus,
    default: OperatingCycleStatus.DRAFT,
  })
  status!: OperatingCycleStatus;

  @Column({ type: "date", nullable: true })
  startsOn!: string | null;

  @Column({ type: "date", nullable: true })
  endsOn!: string | null;

  @Column({ type: "numeric", precision: 18, scale: 2, nullable: true })
  targetAmount!: string | null;

  @Column({ type: "timestamptz", nullable: true })
  openedAt!: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  closedAt!: Date | null;

  @OneToMany(() => CycleParticipant, (participant) => participant.cycle)
  participants!: CycleParticipant[];
}