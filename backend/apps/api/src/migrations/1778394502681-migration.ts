import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1778394502681 implements MigrationInterface {
    name = 'Migration1778394502681'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user_invitations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" uuid NOT NULL, "userId" uuid NOT NULL, "tenantUserId" uuid NOT NULL, "tokenHash" character varying(255) NOT NULL, "email" character varying(255) NOT NULL, "status" character varying(50) NOT NULL DEFAULT 'pending', "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "acceptedAt" TIMESTAMP WITH TIME ZONE, "revokedAt" TIMESTAMP WITH TIME ZONE, "invitedByUserId" uuid, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c8005acb91c3ce9a7ae581eca8f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a12cf2521e6d41039a91d5a492" ON "user_invitations" ("tenantId") `);
        await queryRunner.query(`CREATE INDEX "IDX_4d2a7c49fad8d0160ec24dd11f" ON "user_invitations" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_9298e529b9e20539f3c6592ea8" ON "user_invitations" ("tenantUserId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_1bd83bea480593536e6549b666" ON "user_invitations" ("tokenHash") `);
        await queryRunner.query(`ALTER TABLE "users" ADD "mustChangePassword" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "users" ADD "passwordChangedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "tenant_users" ADD "activatedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "passwordHash"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "passwordHash" character varying(255)`);
        await queryRunner.query(`ALTER TABLE "user_invitations" ADD CONSTRAINT "FK_a12cf2521e6d41039a91d5a492d" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_invitations" ADD CONSTRAINT "FK_4d2a7c49fad8d0160ec24dd11fd" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_invitations" ADD CONSTRAINT "FK_9298e529b9e20539f3c6592ea87" FOREIGN KEY ("tenantUserId") REFERENCES "tenant_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_invitations" DROP CONSTRAINT "FK_9298e529b9e20539f3c6592ea87"`);
        await queryRunner.query(`ALTER TABLE "user_invitations" DROP CONSTRAINT "FK_4d2a7c49fad8d0160ec24dd11fd"`);
        await queryRunner.query(`ALTER TABLE "user_invitations" DROP CONSTRAINT "FK_a12cf2521e6d41039a91d5a492d"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "passwordHash"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "passwordHash" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tenant_users" DROP COLUMN "activatedAt"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "passwordChangedAt"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "mustChangePassword"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1bd83bea480593536e6549b666"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9298e529b9e20539f3c6592ea8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4d2a7c49fad8d0160ec24dd11f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a12cf2521e6d41039a91d5a492"`);
        await queryRunner.query(`DROP TABLE "user_invitations"`);
    }

}
