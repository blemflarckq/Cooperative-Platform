import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1783664189226 implements MigrationInterface {
    name = 'Migration1783664189226'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "loans" ADD "cycleId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "loans" ALTER COLUMN "selfFundedPrincipal" SET DEFAULT '0.00'`);
        await queryRunner.query(`ALTER TABLE "loans" ALTER COLUMN "selfFundedOutstandingPrincipal" SET DEFAULT '0.00'`);
        await queryRunner.query(`ALTER TABLE "loans" ALTER COLUMN "peerFundedPrincipal" SET DEFAULT '0.00'`);
        await queryRunner.query(`ALTER TABLE "loans" ALTER COLUMN "peerFundedOutstandingPrincipal" SET DEFAULT '0.00'`);
        await queryRunner.query(`ALTER TABLE "loans" ADD CONSTRAINT "FK_84d6e6176d910444bd7fc192467" FOREIGN KEY ("cycleId") REFERENCES "operating_cycles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "loans" DROP CONSTRAINT "FK_84d6e6176d910444bd7fc192467"`);
        await queryRunner.query(`ALTER TABLE "loans" ALTER COLUMN "peerFundedOutstandingPrincipal" SET DEFAULT 0.00`);
        await queryRunner.query(`ALTER TABLE "loans" ALTER COLUMN "peerFundedPrincipal" SET DEFAULT 0.00`);
        await queryRunner.query(`ALTER TABLE "loans" ALTER COLUMN "selfFundedOutstandingPrincipal" SET DEFAULT 0.00`);
        await queryRunner.query(`ALTER TABLE "loans" ALTER COLUMN "selfFundedPrincipal" SET DEFAULT 0.00`);
        await queryRunner.query(`ALTER TABLE "loans" DROP COLUMN "cycleId"`);
    }

}
