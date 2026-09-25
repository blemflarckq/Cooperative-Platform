import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1790067163747 implements MigrationInterface {
    name = 'Migration1790067163747'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Deliberately separate from updatedAt, which bumps on any
        // change to a loan row and would misreport "how long has this
        // been at risk" as "when was this row last touched at all."
        // Backfilled as NULL for existing at-risk loans — there's no
        // way to know retroactively when they actually crossed the
        // threshold, and a fabricated timestamp would be worse than an
        // honest gap for historical rows.
        await queryRunner.query(`ALTER TABLE "loans" ADD "flaggedAtRiskAt" TIMESTAMPTZ`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "loans" DROP COLUMN "flaggedAtRiskAt"`);
    }

}
