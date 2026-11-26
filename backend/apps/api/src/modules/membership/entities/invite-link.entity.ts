import { Column, Entity, JoinColumn, ManyToOne, Unique } from "typeorm";
import { BaseEntity } from "../../../common/db/base.entity";
import { TenantUser } from "../../identity/entities/tenant-user.entity";

/**
 * A short-lived, single-use link an admin or treasurer generates and
 * shares directly (WhatsApp being the expected real-world channel) with
 * one specific person they're inviting. Deliberately single-use, not a
 * generic "anyone can join" link — it's generated for one person in one
 * conversation, matching how these invitations actually happen.
 *
 * 4 hours is intentionally tight: this is meant to feel like "admin and
 * new member, live, right now," not "here's a link for whenever this
 * week." The person following it, and every approval decision on their
 * enrollment, is expected to happen inside this same window.
 */
@Entity("invite_links")
@Unique("UQ_invite_links_token", ["token"])
export class InviteLink extends BaseEntity {
  @Column("uuid")
  tenantId!: string;

  @Column()
  token!: string;

  @Column("uuid")
  generatedByTenantUserId!: string;

  @ManyToOne(() => TenantUser, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "generatedByTenantUserId", foreignKeyConstraintName: "FK_invite_links_generated_by" })
  generatedBy!: TenantUser;

  @Column({ type: "timestamptz" })
  expiresAt!: Date;

  /** Set the instant someone follows the link and their enrollment
   * request is created — makes the link single-use without needing a
   * separate "used" boolean. */
  @Column({ type: "timestamptz", nullable: true })
  consumedAt!: Date | null;
}
