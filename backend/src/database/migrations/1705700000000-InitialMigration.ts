import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1705700000000 implements MigrationInterface {
  name = 'InitialMigration1705700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      CREATE TYPE "usage_type_enum" AS ENUM ('ia_request', 'ia_tokens', 'image_generation', 'post_creation')
    `);
    
    await queryRunner.query(`
      CREATE TYPE "log_source_enum" AS ENUM ('telegram', 'ia', 'images', 'wordpress', 'system')
    `);
    
    await queryRunner.query(`
      CREATE TYPE "log_level_enum" AS ENUM ('info', 'warn', 'error', 'debug')
    `);
    
    await queryRunner.query(`
      CREATE TYPE "post_status_enum" AS ENUM ('pending_text', 'pending_approval', 'approved', 'generating_images', 'ready', 'published', 'cancelled', 'error')
    `);

    // Create admin table
    await queryRunner.query(`
      CREATE TABLE "admin" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "username" character varying NOT NULL,
        "password" character varying NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_admin_username" UNIQUE ("username"),
        CONSTRAINT "PK_admin" PRIMARY KEY ("id")
      )
    `);

    // Create credentials table
    await queryRunner.query(`
      CREATE TABLE "credentials" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "key" character varying NOT NULL,
        "value" text NOT NULL,
        "isEncrypted" boolean NOT NULL DEFAULT false,
        "description" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_credentials_key" UNIQUE ("key"),
        CONSTRAINT "PK_credentials" PRIMARY KEY ("id")
      )
    `);

    // Create prompts table
    await queryRunner.query(`
      CREATE TABLE "prompts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "basePrompt" text NOT NULL,
        "editorialRules" text,
        "language" character varying NOT NULL DEFAULT 'pt-BR',
        "version" integer NOT NULL DEFAULT 1,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_prompts" PRIMARY KEY ("id")
      )
    `);

    // Create limits table
    await queryRunner.query(`
      CREATE TABLE "limits" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "requestsPerHour" integer NOT NULL DEFAULT 10,
        "tokensPerHour" integer NOT NULL DEFAULT 50000,
        "imagesPerDay" integer NOT NULL DEFAULT 50,
        "postsPerHour" integer NOT NULL DEFAULT 5,
        "cooldownSeconds" integer NOT NULL DEFAULT 60,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_limits" PRIMARY KEY ("id")
      )
    `);

    // Create usage table
    await queryRunner.query(`
      CREATE TABLE "usage" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" "usage_type_enum" NOT NULL,
        "count" integer NOT NULL DEFAULT 1,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_usage" PRIMARY KEY ("id")
      )
    `);

    // Create logs table
    await queryRunner.query(`
      CREATE TABLE "logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "source" "log_source_enum" NOT NULL,
        "level" "log_level_enum" NOT NULL DEFAULT 'info',
        "message" text NOT NULL,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_logs" PRIMARY KEY ("id")
      )
    `);

    // Create posts table
    await queryRunner.query(`
      CREATE TABLE "posts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "subject" character varying NOT NULL,
        "generatedText" text,
        "htmlContent" text,
        "imagePrompts" jsonb,
        "generatedImages" jsonb,
        "status" "post_status_enum" NOT NULL DEFAULT 'pending_text',
        "wordpressPostId" character varying,
        "wordpressUrl" character varying,
        "telegramMessageId" character varying,
        "tokensUsed" integer NOT NULL DEFAULT 0,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_posts" PRIMARY KEY ("id")
      )
    `);

    // Create indexes
    await queryRunner.query(`CREATE INDEX "IDX_usage_type" ON "usage" ("type")`);
    await queryRunner.query(`CREATE INDEX "IDX_usage_createdAt" ON "usage" ("createdAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_logs_source" ON "logs" ("source")`);
    await queryRunner.query(`CREATE INDEX "IDX_logs_level" ON "logs" ("level")`);
    await queryRunner.query(`CREATE INDEX "IDX_logs_createdAt" ON "logs" ("createdAt")`);
    await queryRunner.query(`CREATE INDEX "IDX_posts_status" ON "posts" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_posts_createdAt" ON "posts" ("createdAt")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_posts_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_posts_status"`);
    await queryRunner.query(`DROP INDEX "IDX_logs_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_logs_level"`);
    await queryRunner.query(`DROP INDEX "IDX_logs_source"`);
    await queryRunner.query(`DROP INDEX "IDX_usage_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_usage_type"`);
    await queryRunner.query(`DROP TABLE "posts"`);
    await queryRunner.query(`DROP TABLE "logs"`);
    await queryRunner.query(`DROP TABLE "usage"`);
    await queryRunner.query(`DROP TABLE "limits"`);
    await queryRunner.query(`DROP TABLE "prompts"`);
    await queryRunner.query(`DROP TABLE "credentials"`);
    await queryRunner.query(`DROP TABLE "admin"`);
    await queryRunner.query(`DROP TYPE "post_status_enum"`);
    await queryRunner.query(`DROP TYPE "log_level_enum"`);
    await queryRunner.query(`DROP TYPE "log_source_enum"`);
    await queryRunner.query(`DROP TYPE "usage_type_enum"`);
  }
}
