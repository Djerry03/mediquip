import { MigrationInterface, QueryRunner } from 'typeorm';

export class EmailCampaignDeliveries1788000000000 implements MigrationInterface {
  name = 'EmailCampaignDeliveries1788000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "email_campaign_deliveries" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "campaignId" uuid NOT NULL,
      "userId" uuid NOT NULL,
      "status" character varying NOT NULL DEFAULT 'pending',
      "attempts" integer NOT NULL DEFAULT '0',
      "lastError" text,
      "sentAt" TIMESTAMP WITH TIME ZONE,
      "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT "PK_efdf0a3d604d6cdba539cd337a0" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_96805dc9c0d7d171db1ec82a2dc" ON "email_campaign_deliveries" ("campaignId", "userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_427ac8d4a4f74386b691a7a97d4" ON "email_campaign_deliveries" ("campaignId", "status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_427ac8d4a4f74386b691a7a97d4"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_96805dc9c0d7d171db1ec82a2dc"`);
    await queryRunner.query(`DROP TABLE "email_campaign_deliveries"`);
  }
}
