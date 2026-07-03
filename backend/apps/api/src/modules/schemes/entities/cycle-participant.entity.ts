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
import { OperatingCycle } from "./operating-cycle.entity";
import { CycleParticipantStatus } from "../enums/scheme.enums";

@Entity("cycle_participants")
@Index(["tenantId", "cycleId", "tenantUserId"], { unique: true })
@Index(["tenantId", "status"])
export class CycleParticipant extends BaseEntity {
  @Column("uuid")
  tenantId!: string;

  @ManyToOne(() => Tenant, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "tenantId" })
  tenant!: Tenant;

  @Column("uuid")
  cycleId!: string;

  @ManyToOne(() => OperatingCycle, (cycle) => cycle.participants, {
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "cycleId" })
  cycle!: OperatingCycle;

  @Column("uuid")
  tenantUserId!: string;

  @ManyToOne(() => TenantUser, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "tenantUserId" })
  tenantUser!: TenantUser;

  @Column({
    type: "enum",
    enum: CycleParticipantStatus,
    default: CycleParticipantStatus.ACTIVE,
  })
  status!: CycleParticipantStatus;

  @Column({ type: "timestamptz" })
  joinedAt!: Date;

  @Column({ type: "timestamptz", nullable: true })
  exitedAt!: Date | null;

  @Column({ type: "text", nullable: true })
  notes!: string | null;
}