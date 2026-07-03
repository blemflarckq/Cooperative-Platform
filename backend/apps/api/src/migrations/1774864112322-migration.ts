import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1774864112322 implements MigrationInterface {
    name = 'Migration1774864112322'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "fistName" TO "firstName"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "firstName" TO "fistName"`);
    }

}
