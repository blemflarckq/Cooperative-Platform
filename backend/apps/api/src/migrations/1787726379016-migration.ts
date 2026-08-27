import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1787726379016 implements MigrationInterface {
    name = 'Migration1787726379016'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."recorded_payments_status_enum" AS ENUM('UNALLOCATED', 'ALLOCATED')`);
        await queryRunner.query(`CREATE TABLE "recorded_payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "tenantUserId" uuid NOT NULL, "amount" numeric(18,2) NOT NULL, "recordedByTenantUserId" uuid NOT NULL, "recordedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "status" "public"."recorded_payments_status_enum" NOT NULL DEFAULT 'UNALLOCATED', "notes" text, "allocatedAt" TIMESTAMP WITH TIME ZONE, "allocatedByTenantUserId" uuid, CONSTRAINT "PK_0507e7902c1341a5795b50086f3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d6c7b01e63c8fa53149a8df9a1" ON "recorded_payments" ("tenantId", "tenantUserId", "status") `);
        await queryRunner.query(`ALTER TABLE "loans" ALTER COLUMN "selfFundedPrincipal" SET DEFAULT '0.00'`);
        await queryRunner.query(`ALTER TABLE "loans" ALTER COLUMN "selfFundedOutstandingPrincipal" SET DEFAULT '0.00'`);
        await queryRunner.query(`ALTER TABLE "loans" ALTER COLUMN "peerFundedPrincipal" SET DEFAULT '0.00'`);
        await queryRunner.query(`ALTER TABLE "loans" ALTER COLUMN "peerFundedOutstandingPrincipal" SET DEFAULT '0.00'`);
        await queryRunner.query(`ALTER TABLE "recorded_payments" ADD CONSTRAINT "FK_c1f2429c9b0a57ee0a2cfaa00f3" FOREIGN KEY ("tenantUserId") REFERENCES "tenant_users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "recorded_payments" ADD CONSTRAINT "FK_2ac94d9e6b7eb6c9716c42b78b1" FOREIGN KEY ("recordedByTenantUserId") REFERENCES "tenant_users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "recorded_payments" DROP CONSTRAINT "FK_2ac94d9e6b7eb6c9716c42b78b1"`);
        await queryRunner.query(`ALTER TABLE "recorded_payments" DROP CONSTRAINT "FK_c1f2429c9b0a57ee0a2cfaa00f3"`);
        await queryRunner.query(`ALTER TABLE "loans" ALTER COLUMN "peerFundedOutstandingPrincipal" SET DEFAULT 0.00`);
        await queryRunner.query(`ALTER TABLE "loans" ALTER COLUMN "peerFundedPrincipal" SET DEFAULT 0.00`);
        await queryRunner.query(`ALTER TABLE "loans" ALTER COLUMN "selfFundedOutstandingPrincipal" SET DEFAULT 0.00`);
        await queryRunner.query(`ALTER TABLE "loans" ALTER COLUMN "selfFundedPrincipal" SET DEFAULT 0.00`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d6c7b01e63c8fa53149a8df9a1"`);
        await queryRunner.query(`DROP TABLE "recorded_payments"`);
        await queryRunner.query(`DROP TYPE "public"."recorded_payments_status_enum"`);
    }

}
