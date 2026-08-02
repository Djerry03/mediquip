import { MigrationInterface, QueryRunner } from "typeorm";

export class MarketingCampaigns1785653396729 implements MigrationInterface {
    name = 'MarketingCampaigns1785653396729'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "campaign_pages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "slug" character varying NOT NULL, "name" character varying NOT NULL, "title" jsonb NOT NULL, "subtitle" jsonb, "paragraphs" jsonb NOT NULL DEFAULT '[]', "seoDescription" jsonb, "productIds" jsonb NOT NULL DEFAULT '[]', "promotionCode" character varying, "heroImageUrl" character varying, "backgroundColor" character varying, "textColor" character varying, "published" boolean NOT NULL DEFAULT false, "startsAt" TIMESTAMP WITH TIME ZONE, "endsAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_b5103a57a0b9097806e159c5c1a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_9b5e08394de99217377cca87e5" ON "campaign_pages" ("slug") `);
        await queryRunner.query(`CREATE INDEX "IDX_79a59b2323b4df401270918bb2" ON "campaign_pages" ("published") `);
        await queryRunner.query(`CREATE TABLE "email_campaigns" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "subject" character varying NOT NULL, "body" text NOT NULL, "audience" character varying NOT NULL DEFAULT 'newsletter', "status" character varying NOT NULL DEFAULT 'draft', "recipientCount" integer NOT NULL DEFAULT '0', "sentCount" integer NOT NULL DEFAULT '0', "failedCount" integer NOT NULL DEFAULT '0', "sentAt" TIMESTAMP WITH TIME ZONE, "sentByEmail" character varying, "lastError" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_72bad329795785308e66d562350" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_fc77d3d8f8101ab793cf17986f" ON "email_campaigns" ("status") `);
        await queryRunner.query(`ALTER TABLE "products" ADD "featuredRank" integer`);
        await queryRunner.query(`ALTER TABLE "users" ADD "newsletterOptIn" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "users" ADD "newsletterOptInAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "users" ADD "unsubscribeToken" character varying`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c78e50e1671565da16eb77f158" ON "users" ("unsubscribeToken") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_c78e50e1671565da16eb77f158"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "unsubscribeToken"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "newsletterOptInAt"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "newsletterOptIn"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "featuredRank"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fc77d3d8f8101ab793cf17986f"`);
        await queryRunner.query(`DROP TABLE "email_campaigns"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_79a59b2323b4df401270918bb2"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9b5e08394de99217377cca87e5"`);
        await queryRunner.query(`DROP TABLE "campaign_pages"`);
    }

}
