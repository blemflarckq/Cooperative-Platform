import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1793081604683 implements MigrationInterface {
    name = 'Migration1793081604683'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Rename-and-swap rather than ALTER TYPE ... ADD VALUE: works the
        // same on every Postgres version inside TypeORM's per-migration
        // transaction, and is how TypeORM generates enum changes itself.
        await queryRunner.query(`ALTER TYPE "membership_enrollment_requests_status_enum" RENAME TO "membership_enrollment_requests_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "membership_enrollment_requests_status_enum" AS ENUM('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXPIRED')`);
        await queryRunner.query(`ALTER TABLE "membership_enrollment_requests" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "membership_enrollment_requests" ALTER COLUMN "status" TYPE "membership_enrollment_requests_status_enum" USING "status"::"text"::"membership_enrollment_requests_status_enum"`);
        await queryRunner.query(`ALTER TABLE "membership_enrollment_requests" ALTER COLUMN "status" SET DEFAULT 'PENDING_APPROVAL'`);
        await queryRunner.query(`DROP TYPE "membership_enrollment_requests_status_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // EXPIRED has no equivalent in the old enum. Those rows are
        // converted to REJECTED (both mean "this application is over,
        // and they'd need a new invite") rather than silently dropped.
        await queryRunner.query(`UPDATE "membership_enrollment_requests" SET "status" = 'REJECTED' WHERE "status" = 'EXPIRED'`);
        await queryRunner.query(`ALTER TYPE "membership_enrollment_requests_status_enum" RENAME TO "membership_enrollment_requests_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "membership_enrollment_requests_status_enum" AS ENUM('PENDING_APPROVAL', 'APPROVED', 'REJECTED')`);
        await queryRunner.query(`ALTER TABLE "membership_enrollment_requests" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "membership_enrollment_requests" ALTER COLUMN "status" TYPE "membership_enrollment_requests_status_enum" USING "status"::"text"::"membership_enrollment_requests_status_enum"`);
        await queryRunner.query(`ALTER TABLE "membership_enrollment_requests" ALTER COLUMN "status" SET DEFAULT 'PENDING_APPROVAL'`);
        await queryRunner.query(`DROP TYPE "membership_enrollment_requests_status_enum_old"`);
    }

}
