import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserSessionVersion1788000000001 implements MigrationInterface {
  name = 'UserSessionVersion1788000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "sessionVersion" integer NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "sessionVersion"`);
  }
}
