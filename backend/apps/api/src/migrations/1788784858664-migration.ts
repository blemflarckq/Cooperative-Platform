import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1788784858664 implements MigrationInterface {
    name = 'Migration1788784858664'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // OAuth-created accounts (Google, Facebook) don't reliably get a
        // phone number from the provider — this column can no longer be
        // required for every user. Native registration still requires
        // it at the DTO/form level; this only relaxes the database
        // constraint for the one signup path that genuinely can't
        // supply it.
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "mobile" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Reversing this is only safe if no existing row actually has a
        // NULL mobile — if any OAuth-created accounts exist by the time
        // this is rolled back, this statement will fail loudly rather
        // than silently corrupting data, which is the correct behavior.
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "mobile" SET NOT NULL`);
    }

}
