import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1785549596146 implements MigrationInterface {
    name = 'InitialSchema1785549596146'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "boutiques" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nom" character varying NOT NULL, "code" character varying NOT NULL, "quartier" character varying NOT NULL, "point_repere" text NOT NULL, "latitude" double precision NOT NULL, "longitude" double precision NOT NULL, "telephone" character varying NOT NULL, "whatsapp" character varying, "horaires" jsonb, "gere_chaine_froid" boolean NOT NULL DEFAULT false, "actif" boolean NOT NULL DEFAULT true, "ordre_affichage" integer NOT NULL DEFAULT '0', CONSTRAINT "UQ_2dbd2a1977da0295c63b5031a42" UNIQUE ("code"), CONSTRAINT "PK_ce3952084821ef81169902c506b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orderId" character varying NOT NULL, "method" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'pending', "amount" integer NOT NULL, "currency" character varying NOT NULL DEFAULT 'XAF', "provider" character varying NOT NULL, "providerReference" character varying, "payerPhone" character varying, "providerPayload" jsonb, "failureReason" text, "confirmedByUserId" character varying, "paidAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_6bd9aa51f09e7dd2727adb8a6e" ON "payments" ("providerReference") `);
        await queryRunner.query(`CREATE INDEX "IDX_af929a5f2a400fdb6913b4967e" ON "payments" ("orderId") `);
        await queryRunner.query(`CREATE TABLE "orders" ("id" character varying NOT NULL, "trackingToken" character varying NOT NULL, "userId" character varying, "client" character varying NOT NULL, "phone" character varying NOT NULL, "email" character varying, "address" text NOT NULL DEFAULT '', "items" jsonb NOT NULL DEFAULT '[]', "itemsTotal" integer NOT NULL DEFAULT '0', "shippingFee" integer NOT NULL DEFAULT '0', "discount" integer NOT NULL DEFAULT '0', "total" integer NOT NULL, "promotionCode" character varying, "status" character varying NOT NULL DEFAULT 'pending', "statusHistory" jsonb NOT NULL DEFAULT '[]', "cancellationReason" text, "paymentMethod" character varying NOT NULL DEFAULT 'cash_on_delivery', "paymentStatus" character varying NOT NULL DEFAULT 'pending', "mode_reception" character varying NOT NULL DEFAULT 'livraison', "boutique_id" character varying, "quartier_id" character varying, "zone_code_snapshot" character varying, "frais_livraison_snapshot" integer, "point_repere_client" text, "telephone_contact" character varying, "code_retrait" character varying, "note" text, "requiresPrescription" boolean NOT NULL DEFAULT false, "prescriptionVerified" boolean NOT NULL DEFAULT false, "idempotenceKey" character varying NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_39846079bcc41df88b6d174335" ON "orders" ("trackingToken") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_4c2291b016aaef54096f70108c" ON "orders" ("idempotenceKey") `);
        await queryRunner.query(`CREATE INDEX "IDX_1f4b9818a08b822a31493fdee9" ON "orders" ("createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_775c9f06fc27ae3ff8fb26f2c4" ON "orders" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_151b79a83ba240b0cb31b2302d" ON "orders" ("userId") `);
        await queryRunner.query(`CREATE TABLE "prescription_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying, "clientName" character varying NOT NULL, "phone" character varying NOT NULL, "email" character varying, "note" text, "storedFileName" character varying NOT NULL, "mimeType" character varying NOT NULL, "sizeBytes" integer NOT NULL, "status" character varying NOT NULL DEFAULT 'received', "adminNote" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6db7c77d188267f7cb58f3356ff" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_5fedf5ec32c28a542cd6d19424" ON "prescription_requests" ("userId") `);
        await queryRunner.query(`CREATE TABLE "products" ("id" character varying NOT NULL, "slug" character varying, "cat" jsonb NOT NULL, "name" jsonb NOT NULL, "price" integer NOT NULL, "oldPrice" integer, "flags" text NOT NULL, "delay" character varying NOT NULL, "rating" double precision NOT NULL, "reviews" integer NOT NULL, "desc" jsonb NOT NULL, "variants" jsonb NOT NULL DEFAULT '{}', "images" jsonb NOT NULL DEFAULT '[]', "poids_kg" double precision NOT NULL DEFAULT '0', "est_fragile" boolean NOT NULL DEFAULT false, "necessite_chaine_froid" boolean NOT NULL DEFAULT false, "livraison_autorisee" boolean NOT NULL DEFAULT true, "necessite_ordonnance" boolean NOT NULL DEFAULT false, "actif" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_464f927ae360106b783ed0b410" ON "products" ("slug") `);
        await queryRunner.query(`CREATE TABLE "promotions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying NOT NULL, "type" character varying NOT NULL DEFAULT 'percent', "value" integer NOT NULL DEFAULT '0', "minAmount" integer NOT NULL DEFAULT '0', "maxDiscount" integer NOT NULL DEFAULT '0', "startsAt" TIMESTAMP WITH TIME ZONE, "expiresAt" TIMESTAMP WITH TIME ZONE, "maxRedemptions" integer NOT NULL DEFAULT '0', "redemptions" integer NOT NULL DEFAULT '0', "maxPerCustomer" integer NOT NULL DEFAULT '1', "active" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_380cecbbe3ac11f0e5a7c452c34" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_8ab10e580f70c3d2e2e4b31ebf" ON "promotions" ("code") `);
        await queryRunner.query(`CREATE TABLE "quartiers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nom" character varying NOT NULL, "slug" character varying NOT NULL, "alias" jsonb NOT NULL DEFAULT '[]', "zone_id" character varying NOT NULL, "boutique_defaut_id" character varying NOT NULL, "latitude" double precision, "longitude" double precision, "actif" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_754bc16135e5ed39e2ae6ebb90e" UNIQUE ("slug"), CONSTRAINT "PK_0a0991cf012588e884bc4ecbde0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_bd4974d58eb15907878ef0eace" ON "quartiers" ("zone_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_754bc16135e5ed39e2ae6ebb90" ON "quartiers" ("slug") `);
        await queryRunner.query(`CREATE INDEX "IDX_6f97146184448be0ee00165674" ON "quartiers" ("nom") `);
        await queryRunner.query(`CREATE TABLE "regles_livraison" ("id" character varying NOT NULL, "seuil_franco" integer NOT NULL DEFAULT '50000', "poids_inclus_kg" double precision NOT NULL DEFAULT '5', "prix_par_kg_supplementaire" integer NOT NULL DEFAULT '200', "supplement_fragile" integer NOT NULL DEFAULT '1000', "supplement_chaine_froid" integer NOT NULL DEFAULT '2000', "supplement_express" integer NOT NULL DEFAULT '1500', "supplement_boutique_eloignee" integer NOT NULL DEFAULT '1000', "livraison_active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_5d05bc1d00dfcbbe69ccb99f7b6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "productId" character varying NOT NULL, "userId" character varying NOT NULL, "authorName" character varying NOT NULL, "rating" integer NOT NULL, "comment" text NOT NULL, "orderId" character varying, "status" character varying NOT NULL DEFAULT 'pending', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_9007ffba411fd471dfe233dabfb" UNIQUE ("userId", "productId"), CONSTRAINT "PK_231ae565c273ee700b283f15c1d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_19bcf7bbb9c2beec008ecd811e" ON "reviews" ("productId", "status") `);
        await queryRunner.query(`CREATE TABLE "stocks" ("produit_id" character varying NOT NULL, "boutique_id" character varying NOT NULL, "quantite" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_a3018a014246a1e392814935c39" PRIMARY KEY ("produit_id", "boutique_id"))`);
        await queryRunner.query(`CREATE TABLE "stock_movements" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "produit_id" character varying NOT NULL, "boutique_id" character varying NOT NULL, "delta" integer NOT NULL, "quantiteApres" integer NOT NULL, "reason" character varying NOT NULL, "orderId" character varying, "userId" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_57a26b190618550d8e65fb860e7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d8967cd36eb63fa1d514b4605a" ON "stock_movements" ("produit_id", "boutique_id") `);
        await queryRunner.query(`CREATE TABLE "tarifs_livraison" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "boutique_id" character varying NOT NULL, "zone_id" character varying NOT NULL, "montant" integer NOT NULL, "actif" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_e97f345bf15b68d9dbebb5b4638" UNIQUE ("boutique_id", "zone_id"), CONSTRAINT "PK_ff41f9036e134a77cba3202d2d5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "passwordHash" character varying NOT NULL, "fullName" character varying NOT NULL, "phone" character varying, "role" character varying NOT NULL DEFAULT 'customer', "emailVerified" boolean NOT NULL DEFAULT false, "defaultQuartierId" character varying, "defaultPointRepere" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
        await queryRunner.query(`CREATE TABLE "zones" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying NOT NULL, "libelle" character varying NOT NULL, "delai_estime" character varying NOT NULL, "livraison_disponible" boolean NOT NULL DEFAULT true, "actif" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_86b75386fa58bba36cce8754fe7" UNIQUE ("code"), CONSTRAINT "PK_880484a43ca311707b05895bd4a" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "zones"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "tarifs_livraison"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d8967cd36eb63fa1d514b4605a"`);
        await queryRunner.query(`DROP TABLE "stock_movements"`);
        await queryRunner.query(`DROP TABLE "stocks"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_19bcf7bbb9c2beec008ecd811e"`);
        await queryRunner.query(`DROP TABLE "reviews"`);
        await queryRunner.query(`DROP TABLE "regles_livraison"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6f97146184448be0ee00165674"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_754bc16135e5ed39e2ae6ebb90"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bd4974d58eb15907878ef0eace"`);
        await queryRunner.query(`DROP TABLE "quartiers"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8ab10e580f70c3d2e2e4b31ebf"`);
        await queryRunner.query(`DROP TABLE "promotions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_464f927ae360106b783ed0b410"`);
        await queryRunner.query(`DROP TABLE "products"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5fedf5ec32c28a542cd6d19424"`);
        await queryRunner.query(`DROP TABLE "prescription_requests"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_151b79a83ba240b0cb31b2302d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_775c9f06fc27ae3ff8fb26f2c4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1f4b9818a08b822a31493fdee9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4c2291b016aaef54096f70108c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_39846079bcc41df88b6d174335"`);
        await queryRunner.query(`DROP TABLE "orders"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_af929a5f2a400fdb6913b4967e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6bd9aa51f09e7dd2727adb8a6e"`);
        await queryRunner.query(`DROP TABLE "payments"`);
        await queryRunner.query(`DROP TABLE "boutiques"`);
    }

}
