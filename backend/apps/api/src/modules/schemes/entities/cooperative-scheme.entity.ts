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
import { OperatingCycle } from "./operating-cycle.entity";
import {
  ContributionMode,
  CycleMode,
  LoanMode,
  PayoutMode,
  SchemeStatus,
  SchemeVisibilityMode,
} from "../enums/scheme.enums";

@Entity("cooperative_schemes")
@Index(["tenantId", "code"], { unique: true })
@Index(["tenantId", "name"], { unique: true })
export class CooperativeScheme extends BaseEntity {
  @Column("uuid")
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "tenantId" })
  tenant!: Tenant;

  @Column({ type: "varchar", length: 160 })
  name!: string;

  @Column({ type: "varchar", length: 80 })
  code!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @Column({
    type: "enum",
    enum: SchemeStatus,
    default: SchemeStatus.DRAFT,
  })
  status!: SchemeStatus;

  @Column({
    type: "enum",
    enum: CycleMode,
  })
  cycleMode!: CycleMode;

  @Column({
    type: "enum",
    enum: ContributionMode,
  })
  contributionMode!: ContributionMode;

  @Column({
    type: "enum",
    enum: LoanMode,
    default: LoanMode.DISABLED,
  })
  loanMode!: LoanMode;

  @Column({
    type: "enum",
    enum: PayoutMode,
  })
  payoutMode!: PayoutMode;

  @Column({ type: "boolean", default: true })
  isActive!: boolean;

  /**
   * Configurable by the group's leader — see SchemeVisibilityMode.
   * Defaults to full transparency, matching the platform's baseline
   * trust-and-transparency posture; a leader can opt into ranking mode.
   */
  @Column({
    type: "enum",
    enum: SchemeVisibilityMode,
    default: SchemeVisibilityMode.FULL_TRANSPARENCY,
  })
  visibilityMode!: SchemeVisibilityMode;

  @Column({ type: "timestamptz", nullable: true })
  activatedAt!: Date | null;

  @OneToMany(() => OperatingCycle, (cycle) => cycle.scheme)
  cycles!: OperatingCycle[];
}
