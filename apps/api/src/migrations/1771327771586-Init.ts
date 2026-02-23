import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1771327771586 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS _smoke (
            id bigserial PRIMARY KEY,
            created_at timestamptz NOT NULL DEFAULT now()
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS _smoke;`);
  }
}
