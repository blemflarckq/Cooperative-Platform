import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1785559646934 implements MigrationInterface {
    name = 'Migration1785559646934'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "accounting_settings" ADD "strictPeriodEnforcement" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "loans" ALTER COLUMN "selfFundedPrincipal" SET DEFAULT '0.00'`);
        await queryRunner.query(`ALTER TABLE "loans" ALTER COLUMN "selfFundedOutstandingPrincipal" SET DEFAULT '0.00'`);
        await queryRunner.query(`ALTER TABLE "loans" ALTER COLUMN "peerFundedPrincipal" SET DEFAULT '0.00'`);
        await queryRunner.query(`ALTER TABLE "loans" ALTER COLUMN "peerFundedOutstandingPrincipal" SET DEFAULT '0.00'`);
        await queryRunner.query(`ALTER TYPE "public"."contributions_source_enum" RENAME TO "contributions_source_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."contributions_source_enum" AS ENUM('CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'OTHER', 'LOAN_INTEREST_CREDIT')`);
        await queryRunner.query(`ALTER TABLE "contributions" ALTER COLUMN "source" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "contributions" ALTER COLUMN "source" TYPE "public"."contributions_source_enum" USING "source"::"text"::"public"."contributions_source_enum"`);
        await queryRunner.query(`ALTER TABLE "contributions" ALTER COLUMN "source" SET DEFAULT 'CASH'`);
        await queryRunner.query(`DROP TYPE "public"."contributions_source_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."contributions_source_enum_old" AS ENUM('CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'OTHER')`);
        await queryRunner.query(`ALTER TABLE "contributions" ALTER COLUMN "source" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "contributions" ALTER COLUMN "source" TYPE "public"."contributions_source_enum_old" USING "source"::"text"::"public"."contributions_source_enum_old"`);
        await queryRunner.query(`ALTER TABLE "contributions" ALTER COLUMN "source" SET DEFAULT 'CASH'`);
        await queryRunner.query(`DROP TYPE "public"."contributions_source_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."contributions_source_enum_old" RENAME TO "contributions_source_enum"`);
        await queryRunner.query(`ALTER TABLE "loans" ALTER COLUMN "peerFundedOutstandingPrincipal" SET DEFAULT 0.00`);
        await queryRunner.query(`ALTER TABLE "loans" ALTER COLUMN "peerFundedPrincipal" SET DEFAULT 0.00`);
        await queryRunner.query(`ALTER TABLE "loans" ALTER COLUMN "selfFundedOutstandingPrincipal" SET DEFAULT 0.00`);
        await queryRunner.query(`ALTER TABLE "loans" ALTER COLUMN "selfFundedPrincipal" SET DEFAULT 0.00`);
        await queryRunner.query(`ALTER TABLE "accounting_settings" DROP COLUMN "strictPeriodEnforcement"`);
    }

}
