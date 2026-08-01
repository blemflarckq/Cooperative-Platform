import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1785565744899 implements MigrationInterface {
    name = 'Migration1785565744899'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "loan_policies" ADD "isReviewed" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "loans" ALTER COLUMN "selfFundedPrincipal" SET DEFAULT '0.00'`);
        await queryRunner.query(`ALTER TABLE "loans" ALTER COLUMN "selfFundedOutstandingPrincipal" SET DEFAULT '0.00'`);
        await queryRunner.query(`ALTER TABLE "loans" ALTER COLUMN "peerFundedPrincipal" SET DEFAULT '0.00'`);
        await queryRunner.query(`ALTER TABLE "loans" ALTER COLUMN "peerFundedOutstandingPrincipal" SET DEFAULT '0.00'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "loans" ALTER COLUMN "peerFundedOutstandingPrincipal" SET DEFAULT 0.00`);
        await queryRunner.query(`ALTER TABLE "loans" ALTER COLUMN "peerFundedPrincipal" SET DEFAULT 0.00`);
        await queryRunner.query(`ALTER TABLE "loans" ALTER COLUMN "selfFundedOutstandingPrincipal" SET DEFAULT 0.00`);
        await queryRunner.query(`ALTER TABLE "loans" ALTER COLUMN "selfFundedPrincipal" SET DEFAULT 0.00`);
        await queryRunner.query(`ALTER TABLE "loan_policies" DROP COLUMN "isReviewed"`);
    }

}
