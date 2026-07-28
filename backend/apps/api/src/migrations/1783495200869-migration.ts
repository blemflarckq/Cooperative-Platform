import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1783495200869 implements MigrationInterface {
    name = 'Migration1783495200869'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."scheme_role_assignments_roletype_enum" AS ENUM('TREASURER', 'COMMITTEE_MEMBER', 'AUDITOR')`);
        await queryRunner.query(`CREATE TABLE "scheme_role_assignments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "schemeId" uuid NOT NULL, "tenantUserId" uuid NOT NULL, "roleType" "public"."scheme_role_assignments_roletype_enum" NOT NULL, "startsAt" TIMESTAMP WITH TIME ZONE NOT NULL, "endsAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_39b26921bdd9707d5246c138783" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_83fc43e069a60f36f538f5d7af" ON "scheme_role_assignments" ("tenantId", "schemeId", "roleType") `);
        await queryRunner.query(`CREATE TYPE "public"."role_transition_petitions_status_enum" AS ENUM('OPEN', 'RESOLVED')`);
        await queryRunner.query(`CREATE TABLE "role_transition_petitions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "schemeId" uuid NOT NULL, "raisedByTenantUserId" uuid NOT NULL, "description" text NOT NULL, "status" "public"."role_transition_petitions_status_enum" NOT NULL DEFAULT 'OPEN', "resolvedByUserId" uuid, "resolutionNotes" text, "resolvedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_c947de79966cd80da581e664073" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."outbound_request_approvals_decision_enum" AS ENUM('APPROVED', 'REJECTED')`);
        await queryRunner.query(`CREATE TABLE "outbound_request_approvals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "outboundRequestId" uuid NOT NULL, "approverTenantUserId" uuid NOT NULL, "decision" "public"."outbound_request_approvals_decision_enum" NOT NULL, "comment" text, "decidedAt" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_90322729946fb132e2624c5a09a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_2f5310dc2307dafd886f513cbb" ON "outbound_request_approvals" ("outboundRequestId", "approverTenantUserId") `);
        await queryRunner.query(`CREATE TYPE "public"."outbound_requests_requesttype_enum" AS ENUM('LOAN_DISBURSEMENT', 'PROJECT_EXPENSE', 'GENERAL_WITHDRAWAL')`);
        await queryRunner.query(`CREATE TYPE "public"."outbound_requests_status_enum" AS ENUM('INITIATED', 'APPROVED', 'REJECTED', 'EXECUTED')`);
        await queryRunner.query(`CREATE TABLE "outbound_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "schemeId" uuid NOT NULL, "requestType" "public"."outbound_requests_requesttype_enum" NOT NULL, "amount" numeric(18,2) NOT NULL, "purpose" text NOT NULL, "status" "public"."outbound_requests_status_enum" NOT NULL DEFAULT 'INITIATED', "initiatedByTenantUserId" uuid NOT NULL, "sourceReference" character varying(120), "executedJournalEntryId" uuid, "executedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_721144bca8180f4838cd8cefb9e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0847e446fa8b70078d36df9764" ON "outbound_requests" ("tenantId", "schemeId", "status") `);
        await queryRunner.query(`CREATE TYPE "public"."approval_policies_eligibleroletypes_enum" AS ENUM('TREASURER', 'COMMITTEE_MEMBER', 'AUDITOR')`);
        await queryRunner.query(`CREATE TABLE "approval_policies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "schemeId" uuid NOT NULL, "eligibleRoleTypes" "public"."approval_policies_eligibleroletypes_enum" array NOT NULL, "requiredApprovals" integer NOT NULL DEFAULT '2', CONSTRAINT "PK_09d33ba3a56c2f804ef511eb680" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_3636d854b301d88652614760eb" ON "approval_policies" ("tenantId", "schemeId") `);
        await queryRunner.query(`CREATE TYPE "public"."cooperative_schemes_visibilitymode_enum" AS ENUM('FULL_TRANSPARENCY', 'RANKING')`);
        await queryRunner.query(`ALTER TABLE "cooperative_schemes" ADD "visibilityMode" "public"."cooperative_schemes_visibilitymode_enum" NOT NULL DEFAULT 'FULL_TRANSPARENCY'`);
        await queryRunner.query(`ALTER TABLE "scheme_role_assignments" ADD CONSTRAINT "FK_64aba861d05b5c49357307225a7" FOREIGN KEY ("schemeId") REFERENCES "cooperative_schemes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "scheme_role_assignments" ADD CONSTRAINT "FK_085e87b736c1dbdcd617c635a63" FOREIGN KEY ("tenantUserId") REFERENCES "tenant_users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "role_transition_petitions" ADD CONSTRAINT "FK_13f4b1d39072e77cb250b26bfe0" FOREIGN KEY ("schemeId") REFERENCES "cooperative_schemes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "role_transition_petitions" ADD CONSTRAINT "FK_dbe11498a488f1f0f14fe20e2a8" FOREIGN KEY ("raisedByTenantUserId") REFERENCES "tenant_users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "outbound_request_approvals" ADD CONSTRAINT "FK_bfb8f7fffc5d9a6b1f7edf7bb1c" FOREIGN KEY ("outboundRequestId") REFERENCES "outbound_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "outbound_request_approvals" ADD CONSTRAINT "FK_b60b5fa3f5272e79024d065ffa7" FOREIGN KEY ("approverTenantUserId") REFERENCES "tenant_users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "outbound_requests" ADD CONSTRAINT "FK_96a3acb9d810c90024fdbd9514f" FOREIGN KEY ("schemeId") REFERENCES "cooperative_schemes"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "outbound_requests" ADD CONSTRAINT "FK_61c513b99a70fba6fc6c58979b3" FOREIGN KEY ("initiatedByTenantUserId") REFERENCES "tenant_users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "approval_policies" ADD CONSTRAINT "FK_768971b1d024937e6d5fc528fe3" FOREIGN KEY ("schemeId") REFERENCES "cooperative_schemes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "approval_policies" DROP CONSTRAINT "FK_768971b1d024937e6d5fc528fe3"`);
        await queryRunner.query(`ALTER TABLE "outbound_requests" DROP CONSTRAINT "FK_61c513b99a70fba6fc6c58979b3"`);
        await queryRunner.query(`ALTER TABLE "outbound_requests" DROP CONSTRAINT "FK_96a3acb9d810c90024fdbd9514f"`);
        await queryRunner.query(`ALTER TABLE "outbound_request_approvals" DROP CONSTRAINT "FK_b60b5fa3f5272e79024d065ffa7"`);
        await queryRunner.query(`ALTER TABLE "outbound_request_approvals" DROP CONSTRAINT "FK_bfb8f7fffc5d9a6b1f7edf7bb1c"`);
        await queryRunner.query(`ALTER TABLE "role_transition_petitions" DROP CONSTRAINT "FK_dbe11498a488f1f0f14fe20e2a8"`);
        await queryRunner.query(`ALTER TABLE "role_transition_petitions" DROP CONSTRAINT "FK_13f4b1d39072e77cb250b26bfe0"`);
        await queryRunner.query(`ALTER TABLE "scheme_role_assignments" DROP CONSTRAINT "FK_085e87b736c1dbdcd617c635a63"`);
        await queryRunner.query(`ALTER TABLE "scheme_role_assignments" DROP CONSTRAINT "FK_64aba861d05b5c49357307225a7"`);
        await queryRunner.query(`ALTER TABLE "cooperative_schemes" DROP COLUMN "visibilityMode"`);
        await queryRunner.query(`DROP TYPE "public"."cooperative_schemes_visibilitymode_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3636d854b301d88652614760eb"`);
        await queryRunner.query(`DROP TABLE "approval_policies"`);
        await queryRunner.query(`DROP TYPE "public"."approval_policies_eligibleroletypes_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0847e446fa8b70078d36df9764"`);
        await queryRunner.query(`DROP TABLE "outbound_requests"`);
        await queryRunner.query(`DROP TYPE "public"."outbound_requests_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."outbound_requests_requesttype_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2f5310dc2307dafd886f513cbb"`);
        await queryRunner.query(`DROP TABLE "outbound_request_approvals"`);
        await queryRunner.query(`DROP TYPE "public"."outbound_request_approvals_decision_enum"`);
        await queryRunner.query(`DROP TABLE "role_transition_petitions"`);
        await queryRunner.query(`DROP TYPE "public"."role_transition_petitions_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_83fc43e069a60f36f538f5d7af"`);
        await queryRunner.query(`DROP TABLE "scheme_role_assignments"`);
        await queryRunner.query(`DROP TYPE "public"."scheme_role_assignments_roletype_enum"`);
    }

}
