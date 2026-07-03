import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1775624839650 implements MigrationInterface {
    name = 'Migration1775624839650'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_b4599f8b8f548d35850afa2d12c"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_06792d0c62ce6b0203c03643cdd"`);
        await queryRunner.query(`ALTER TABLE "tenant_users" DROP CONSTRAINT "FK_b60b5094f416190c9b3103cba2a"`);
        await queryRunner.query(`ALTER TABLE "tenant_users" DROP CONSTRAINT "FK_5c0a747551be06a29ac8196037e"`);
        await queryRunner.query(`CREATE TABLE "outbox_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "aggregateType" character varying NOT NULL, "aggregateId" character varying NOT NULL, "eventType" character varying NOT NULL, "payload" jsonb NOT NULL, "headers" jsonb, "lastError" text, "occurredAt" TIMESTAMP WITH TIME ZONE NOT NULL, "publishedAt" TIMESTAMP WITH TIME ZONE, "attempts" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_6689a16c00d09b8089f6237f1d2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ddfd44676b13a42810088c85d5" ON "outbox_events" ("eventType") `);
        await queryRunner.query(`CREATE INDEX "IDX_4cbec8691b761d7d193798dd8f" ON "outbox_events" ("publishedAt") `);
        await queryRunner.query(`ALTER TABLE "permissions" ADD "resource" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "permissions" ADD "action" character varying(100)`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "PK_d430a02aad006d8a70f3acd7d03"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "PK_e5cb36794a808878b1ef24f694f" PRIMARY KEY ("roleId", "permissionId", "id")`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "roles" ADD "tenantId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "roles" ADD "code" character varying(200) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "roles" ADD "description" text`);
        await queryRunner.query(`ALTER TABLE "roles" ADD "isActive" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "tenant_users" ADD "status" character varying(50) NOT NULL DEFAULT 'active'`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "PK_e5cb36794a808878b1ef24f694f"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "PK_20584036f1d4ba228c78d1e8618" PRIMARY KEY ("permissionId", "id")`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "PK_20584036f1d4ba228c78d1e8618"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "PK_84059017c90bfcb701b8fa42297" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "tenants" DROP CONSTRAINT "UQ_2310ecc5cb8be427097154b18fc"`);
        await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "slug"`);
        await queryRunner.query(`ALTER TABLE "tenants" ADD "slug" character varying(120) NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_89456a09b598ce8915c702c528" ON "permissions" ("resource") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_permissions_key" ON "permissions" ("code") `);
        await queryRunner.query(`CREATE INDEX "IDX_c954ae3b1156e075ccd4e9ce3e" ON "roles" ("tenantId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_tenants_slug" ON "tenants" ("slug") `);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "uq_role_permissions_role_permission" UNIQUE ("roleId", "permissionId")`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_b4599f8b8f548d35850afa2d12c" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_06792d0c62ce6b0203c03643cdd" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "roles" ADD CONSTRAINT "FK_c954ae3b1156e075ccd4e9ce3e6" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tenant_users" ADD CONSTRAINT "FK_b60b5094f416190c9b3103cba2a" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tenant_users" ADD CONSTRAINT "FK_5c0a747551be06a29ac8196037e" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tenant_users" DROP CONSTRAINT "FK_5c0a747551be06a29ac8196037e"`);
        await queryRunner.query(`ALTER TABLE "tenant_users" DROP CONSTRAINT "FK_b60b5094f416190c9b3103cba2a"`);
        await queryRunner.query(`ALTER TABLE "roles" DROP CONSTRAINT "FK_c954ae3b1156e075ccd4e9ce3e6"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_06792d0c62ce6b0203c03643cdd"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_b4599f8b8f548d35850afa2d12c"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "uq_role_permissions_role_permission"`);
        await queryRunner.query(`DROP INDEX "public"."uq_tenants_slug"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c954ae3b1156e075ccd4e9ce3e"`);
        await queryRunner.query(`DROP INDEX "public"."uq_permissions_key"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_89456a09b598ce8915c702c528"`);
        await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN "slug"`);
        await queryRunner.query(`ALTER TABLE "tenants" ADD "slug" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "tenants" ADD CONSTRAINT "UQ_2310ecc5cb8be427097154b18fc" UNIQUE ("slug")`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "PK_84059017c90bfcb701b8fa42297"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "PK_20584036f1d4ba228c78d1e8618" PRIMARY KEY ("permissionId", "id")`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "PK_20584036f1d4ba228c78d1e8618"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "PK_e5cb36794a808878b1ef24f694f" PRIMARY KEY ("roleId", "permissionId", "id")`);
        await queryRunner.query(`ALTER TABLE "tenant_users" DROP COLUMN "status"`);
        await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "isActive"`);
        await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "code"`);
        await queryRunner.query(`ALTER TABLE "roles" DROP COLUMN "tenantId"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP CONSTRAINT "PK_e5cb36794a808878b1ef24f694f"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "PK_d430a02aad006d8a70f3acd7d03" PRIMARY KEY ("roleId", "permissionId")`);
        await queryRunner.query(`ALTER TABLE "role_permissions" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "permissions" DROP COLUMN "action"`);
        await queryRunner.query(`ALTER TABLE "permissions" DROP COLUMN "resource"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4cbec8691b761d7d193798dd8f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ddfd44676b13a42810088c85d5"`);
        await queryRunner.query(`DROP TABLE "outbox_events"`);
        await queryRunner.query(`ALTER TABLE "tenant_users" ADD CONSTRAINT "FK_5c0a747551be06a29ac8196037e" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "tenant_users" ADD CONSTRAINT "FK_b60b5094f416190c9b3103cba2a" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_06792d0c62ce6b0203c03643cdd" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_b4599f8b8f548d35850afa2d12c" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

}
