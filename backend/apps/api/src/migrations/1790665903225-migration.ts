import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1790665903225 implements MigrationInterface {
    name = 'Migration1790665903225'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "invite_links" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
                "tenantId" uuid NOT NULL,
                "token" character varying NOT NULL,
                "generatedByTenantUserId" uuid NOT NULL,
                "expiresAt" TIMESTAMPTZ NOT NULL,
                "consumedAt" TIMESTAMPTZ,
                CONSTRAINT "UQ_invite_links_token" UNIQUE ("token"),
                CONSTRAINT "PK_invite_links" PRIMARY KEY ("id"),
                CONSTRAINT "FK_invite_links_generated_by" FOREIGN KEY ("generatedByTenantUserId") REFERENCES "tenant_users"("id") ON DELETE RESTRICT
            )
        `);

        await queryRunner.query(`
            CREATE TYPE "membership_enrollment_requests_status_enum" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED')
        `);

        await queryRunner.query(`
            CREATE TABLE "membership_enrollment_requests" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
                "tenantId" uuid NOT NULL,
                "inviteLinkId" uuid NOT NULL,
                "userId" uuid NOT NULL,
                "status" "membership_enrollment_requests_status_enum" NOT NULL DEFAULT 'PENDING_APPROVAL',
                "expiresAt" TIMESTAMPTZ NOT NULL,
                CONSTRAINT "PK_membership_enrollment_requests" PRIMARY KEY ("id"),
                CONSTRAINT "FK_enrollment_invite_link" FOREIGN KEY ("inviteLinkId") REFERENCES "invite_links"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_enrollment_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_enrollment_tenant_status" ON "membership_enrollment_requests" ("tenantId", "status")
        `);

        await queryRunner.query(`
            CREATE TYPE "membership_enrollment_approvals_decision_enum" AS ENUM('APPROVED', 'REJECTED')
        `);

        await queryRunner.query(`
            CREATE TABLE "membership_enrollment_approvals" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
                "enrollmentRequestId" uuid NOT NULL,
                "approverTenantUserId" uuid NOT NULL,
                "decision" "membership_enrollment_approvals_decision_enum" NOT NULL,
                "decidedAt" TIMESTAMPTZ NOT NULL,
                CONSTRAINT "PK_membership_enrollment_approvals" PRIMARY KEY ("id"),
                CONSTRAINT "FK_enrollment_approval_request" FOREIGN KEY ("enrollmentRequestId") REFERENCES "membership_enrollment_requests"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_enrollment_approval_approver" FOREIGN KEY ("approverTenantUserId") REFERENCES "tenant_users"("id") ON DELETE RESTRICT,
                CONSTRAINT "UQ_enrollment_approval_once" UNIQUE ("enrollmentRequestId", "approverTenantUserId")
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "membership_enrollment_approvals"`);
        await queryRunner.query(`DROP TYPE "membership_enrollment_approvals_decision_enum"`);
        await queryRunner.query(`DROP INDEX "IDX_enrollment_tenant_status"`);
        await queryRunner.query(`DROP TABLE "membership_enrollment_requests"`);
        await queryRunner.query(`DROP TYPE "membership_enrollment_requests_status_enum"`);
        await queryRunner.query(`DROP TABLE "invite_links"`);
    }

}
