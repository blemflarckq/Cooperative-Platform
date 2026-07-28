import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1783585802391 implements MigrationInterface {
    name = 'Migration1783585802391'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "loan_pledges" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "loanId" uuid NOT NULL, "pledgingTenantUserId" uuid NOT NULL, "pledgedAmount" numeric(18,2) NOT NULL, "outstandingPrincipal" numeric(18,2) NOT NULL, "pledgedAt" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_90ceff2f7cbecebe3e9edf5139f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_761ef4805d7188a6afa2f69f08" ON "loan_pledges" ("loanId", "pledgingTenantUserId") `);
        await queryRunner.query(`CREATE TYPE "public"."loans_atcapbehavior_enum" AS ENUM('CONTINUE_AT_CAP', 'FLAG_AND_BLOCK')`);
        await queryRunner.query(`CREATE TYPE "public"."loans_status_enum" AS ENUM('PENDING_PLEDGES', 'PENDING_APPROVAL', 'ACTIVE', 'AT_RISK', 'REPAID')`);
        await queryRunner.query(`CREATE TABLE "loans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "schemeId" uuid NOT NULL, "borrowerTenantUserId" uuid NOT NULL, "principalAmount" numeric(18,2) NOT NULL, "selfFundedPrincipal" numeric(18,2) NOT NULL DEFAULT '0.00', "selfFundedOutstandingPrincipal" numeric(18,2) NOT NULL DEFAULT '0.00', "selfFundedMonthlyRate" numeric(5,2) NOT NULL, "peerFundedPrincipal" numeric(18,2) NOT NULL DEFAULT '0.00', "peerFundedOutstandingPrincipal" numeric(18,2) NOT NULL DEFAULT '0.00', "currentPeerMonthlyRate" numeric(5,2) NOT NULL, "peerMonthlyRateIncrement" numeric(5,2) NOT NULL, "peerCapRate" numeric(5,2) NOT NULL, "atCapBehavior" "public"."loans_atcapbehavior_enum" NOT NULL, "peerRateLastEscalatedAt" TIMESTAMP WITH TIME ZONE, "status" "public"."loans_status_enum" NOT NULL DEFAULT 'PENDING_PLEDGES', "isAtRiskFlagged" boolean NOT NULL DEFAULT false, "outboundRequestId" uuid, CONSTRAINT "PK_5c6942c1e13e4de135c5203ee61" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_712940276c0bb823d27fc30183" ON "loans" ("tenantId", "schemeId", "status") `);
        await queryRunner.query(`CREATE TABLE "loan_pledge_repayment_allocations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "loanRepaymentId" uuid NOT NULL, "loanPledgeId" uuid NOT NULL, "principalPortion" numeric(18,2) NOT NULL, "interestPortion" numeric(18,2) NOT NULL, CONSTRAINT "PK_968ecc13fe6ed64e433e0b431f2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "loan_repayments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "loanId" uuid NOT NULL, "totalAmount" numeric(18,2) NOT NULL, "selfFundedPrincipalPortion" numeric(18,2) NOT NULL, "selfFundedInterestPortion" numeric(18,2) NOT NULL, "peerFundedPrincipalPortion" numeric(18,2) NOT NULL, "peerFundedInterestPortion" numeric(18,2) NOT NULL, "paidAt" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_a37968e2dcfb72f910f5480cc16" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_94bd354e398a79df9dbc1e877a" ON "loan_repayments" ("tenantId", "loanId") `);
        await queryRunner.query(`CREATE TYPE "public"."loan_policies_atcapbehavior_enum" AS ENUM('CONTINUE_AT_CAP', 'FLAG_AND_BLOCK')`);
        await queryRunner.query(`CREATE TABLE "loan_policies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "schemeId" uuid NOT NULL, "selfFundedMonthlyRate" numeric(5,2) NOT NULL, "peerBaseMonthlyRate" numeric(5,2) NOT NULL, "peerMonthlyRateIncrement" numeric(5,2) NOT NULL, "peerCapRate" numeric(5,2) NOT NULL, "atCapBehavior" "public"."loan_policies_atcapbehavior_enum" NOT NULL, CONSTRAINT "PK_5975c29c35eb5d7a560796ac7a0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_df6b4ddb27e374401779063c25" ON "loan_policies" ("tenantId", "schemeId") `);
        await queryRunner.query(`ALTER TABLE "loan_pledges" ADD CONSTRAINT "FK_8970853a4c598a99b4ce0f59547" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "loan_pledges" ADD CONSTRAINT "FK_63c21b7c21a1c50a29a98f0cbe4" FOREIGN KEY ("pledgingTenantUserId") REFERENCES "tenant_users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "loans" ADD CONSTRAINT "FK_4c1d16e8a334a875bcb40064cff" FOREIGN KEY ("schemeId") REFERENCES "cooperative_schemes"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "loans" ADD CONSTRAINT "FK_5e7f9b4bb394a37218ac6a421ec" FOREIGN KEY ("borrowerTenantUserId") REFERENCES "tenant_users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "loans" ADD CONSTRAINT "FK_2786531a86688a74eaafe3c3a6a" FOREIGN KEY ("outboundRequestId") REFERENCES "outbound_requests"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "loan_pledge_repayment_allocations" ADD CONSTRAINT "FK_ba80fb85eccf864ab960a63950e" FOREIGN KEY ("loanRepaymentId") REFERENCES "loan_repayments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "loan_pledge_repayment_allocations" ADD CONSTRAINT "FK_88d165edc84c0b35e12ba170888" FOREIGN KEY ("loanPledgeId") REFERENCES "loan_pledges"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "loan_repayments" ADD CONSTRAINT "FK_a2f0da4f5cd58b196e6db2d58e3" FOREIGN KEY ("loanId") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "loan_policies" ADD CONSTRAINT "FK_d3e254cbcbb961ac2d81f70070c" FOREIGN KEY ("schemeId") REFERENCES "cooperative_schemes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "loan_policies" DROP CONSTRAINT "FK_d3e254cbcbb961ac2d81f70070c"`);
        await queryRunner.query(`ALTER TABLE "loan_repayments" DROP CONSTRAINT "FK_a2f0da4f5cd58b196e6db2d58e3"`);
        await queryRunner.query(`ALTER TABLE "loan_pledge_repayment_allocations" DROP CONSTRAINT "FK_88d165edc84c0b35e12ba170888"`);
        await queryRunner.query(`ALTER TABLE "loan_pledge_repayment_allocations" DROP CONSTRAINT "FK_ba80fb85eccf864ab960a63950e"`);
        await queryRunner.query(`ALTER TABLE "loans" DROP CONSTRAINT "FK_2786531a86688a74eaafe3c3a6a"`);
        await queryRunner.query(`ALTER TABLE "loans" DROP CONSTRAINT "FK_5e7f9b4bb394a37218ac6a421ec"`);
        await queryRunner.query(`ALTER TABLE "loans" DROP CONSTRAINT "FK_4c1d16e8a334a875bcb40064cff"`);
        await queryRunner.query(`ALTER TABLE "loan_pledges" DROP CONSTRAINT "FK_63c21b7c21a1c50a29a98f0cbe4"`);
        await queryRunner.query(`ALTER TABLE "loan_pledges" DROP CONSTRAINT "FK_8970853a4c598a99b4ce0f59547"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_df6b4ddb27e374401779063c25"`);
        await queryRunner.query(`DROP TABLE "loan_policies"`);
        await queryRunner.query(`DROP TYPE "public"."loan_policies_atcapbehavior_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_94bd354e398a79df9dbc1e877a"`);
        await queryRunner.query(`DROP TABLE "loan_repayments"`);
        await queryRunner.query(`DROP TABLE "loan_pledge_repayment_allocations"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_712940276c0bb823d27fc30183"`);
        await queryRunner.query(`DROP TABLE "loans"`);
        await queryRunner.query(`DROP TYPE "public"."loans_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."loans_atcapbehavior_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_761ef4805d7188a6afa2f69f08"`);
        await queryRunner.query(`DROP TABLE "loan_pledges"`);
    }

}
