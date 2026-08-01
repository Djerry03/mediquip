import { MigrationInterface, QueryRunner } from "typeorm";

export class BannersAndCatalogAdmin1785556236985 implements MigrationInterface {
    name = 'BannersAndCatalogAdmin1785556236985'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "banners" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "placement" character varying NOT NULL, "title" jsonb NOT NULL, "subtitle" jsonb, "ctaLabel" jsonb, "ctaUrl" character varying, "imageUrl" character varying, "backgroundColor" character varying, "textColor" character varying, "startsAt" TIMESTAMP WITH TIME ZONE, "endsAt" TIMESTAMP WITH TIME ZONE, "priority" integer NOT NULL DEFAULT '0', "active" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e9b186b959296fcb940790d31c3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f074cf9c09dec49d6148a62200" ON "banners" ("placement", "active") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_f074cf9c09dec49d6148a62200"`);
        await queryRunner.query(`DROP TABLE "banners"`);
    }

}
