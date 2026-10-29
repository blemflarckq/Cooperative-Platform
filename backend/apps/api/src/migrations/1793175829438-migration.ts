import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1793175829438 implements MigrationInterface {
    name = 'Migration1793175829438'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Everything defaults to RAMP / NULL, so every existing policy and
        // every existing loan keeps behaving exactly as before.
        await queryRunner.query(`CREATE TYPE "loan_policies_rateschedulemode_enum" AS ENUM('RAMP', 'PERIODS')`);
        await queryRunner.query(`ALTER TABLE "loan_policies" ADD "rateScheduleMode" "loan_policies_rateschedulemode_enum" NOT NULL DEFAULT 'RAMP'`);
        await queryRunner.query(`ALTER TABLE "loan_policies" ADD "initialPeriodMonths" integer`);
        await queryRunner.query(`ALTER TABLE "loan_policies" ADD "laterPeriodMonths" integer`);
        await queryRunner.query(`ALTER TABLE "loan_policies" ADD "peerLaterMonthlyRate" numeric(5,2)`);

        await queryRunner.query(`CREATE TYPE "loans_rateschedulemode_enum" AS ENUM('RAMP', 'PERIODS')`);
        await queryRunner.query(`ALTER TABLE "loans" ADD "rateScheduleMode" "loans_rateschedulemode_enum" NOT NULL DEFAULT 'RAMP'`);
        await queryRunner.query(`ALTER TABLE "loans" ADD "initialPeriodMonths" integer`);
        await queryRunner.query(`ALTER TABLE "loans" ADD "laterPeriodMonths" integer`);
        await queryRunner.query(`ALTER TABLE "loans" ADD "peerInitialMonthlyRate" numeric(5,2)`);
        await queryRunner.query(`ALTER TABLE "loans" ADD "peerLaterMonthlyRate" numeric(5,2)`);
        // Deliberately NOT backfilled: for a loan disbursed before this
        // existed there is no reliable disbursement date to put here, and a
        // guess would be worse than an honest NULL. Only PERIODS loans need
        // it, and none can predate this migration.
        await queryRunner.query(`ALTER TABLE "loans" ADD "disbursedAt" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "loans" DROP COLUMN "disbursedAt"`);
        await queryRunner.query(`ALTER TABLE "loans" DROP COLUMN "peerLaterMonthlyRate"`);
        await queryRunner.query(`ALTER TABLE "loans" DROP COLUMN "peerInitialMonthlyRate"`);
        await queryRunner.query(`ALTER TABLE "loans" DROP COLUMN "laterPeriodMonths"`);
        await queryRunner.query(`ALTER TABLE "loans" DROP COLUMN "initialPeriodMonths"`);
        await queryRunner.query(`ALTER TABLE "loans" DROP COLUMN "rateScheduleMode"`);
        await queryRunner.query(`DROP TYPE "loans_rateschedulemode_enum"`);

        await queryRunner.query(`ALTER TABLE "loan_policies" DROP COLUMN "peerLaterMonthlyRate"`);
        await queryRunner.query(`ALTER TABLE "loan_policies" DROP COLUMN "laterPeriodMonths"`);
        await queryRunner.query(`ALTER TABLE "loan_policies" DROP COLUMN "initialPeriodMonths"`);
        await queryRunner.query(`ALTER TABLE "loan_policies" DROP COLUMN "rateScheduleMode"`);
        await queryRunner.query(`DROP TYPE "loan_policies_rateschedulemode_enum"`);
    }

}
