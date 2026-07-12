-- Normalize Arrivo tables to the shared database contract:
-- uuid(7) IDs, tenant-scoped data, audit fields, soft-delete defaults, and indexes.

CREATE OR REPLACE FUNCTION uuidv7()
RETURNS uuid AS $$
DECLARE
  unix_ts_ms bigint := floor(extract(epoch from clock_timestamp()) * 1000);
  random_hex text := md5(random()::text || clock_timestamp()::text) || md5(clock_timestamp()::text || random()::text);
  bytes bytea;
BEGIN
  bytes := decode(lpad(to_hex(unix_ts_ms), 12, '0') || substring(random_hex from 1 for 20), 'hex');
  bytes := set_byte(bytes, 6, (get_byte(bytes, 6) & 15) | 112);
  bytes := set_byte(bytes, 8, (get_byte(bytes, 8) & 63) | 128);
  RETURN encode(bytes, 'hex')::uuid;
END;
$$ LANGUAGE plpgsql VOLATILE;

CREATE OR REPLACE FUNCTION "__arrivo_pk_uuid_v7"("namespace" text, "old_id" text)
RETURNS uuid AS $$
DECLARE
  legacy_ms bigint := 1783209600000;
  random_hex text;
  bytes bytea;
BEGIN
  IF "old_id" IS NOT NULL
    AND "old_id" ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN "old_id"::uuid;
  END IF;

  random_hex := md5("namespace" || ':' || coalesce("old_id", '')) || md5(coalesce("old_id", '') || ':' || "namespace");
  bytes := decode(lpad(to_hex(legacy_ms), 12, '0') || substring(random_hex from 1 for 20), 'hex');
  bytes := set_byte(bytes, 6, (get_byte(bytes, 6) & 15) | 112);
  bytes := set_byte(bytes, 8, (get_byte(bytes, 8) & 63) | 128);
  RETURN encode(bytes, 'hex')::uuid;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION "__arrivo_optional_uuid_v7"("namespace" text, "old_id" text)
RETURNS uuid AS $$
BEGIN
  IF "old_id" IS NULL OR "old_id" = '' THEN
    RETURN NULL;
  END IF;
  RETURN "__arrivo_pk_uuid_v7"("namespace", "old_id");
END;
$$ LANGUAGE plpgsql IMMUTABLE;

ALTER TABLE "Articles" DROP CONSTRAINT IF EXISTS "Articles_userId_fkey";
ALTER TABLE "Sentences" DROP CONSTRAINT IF EXISTS "Sentences_articleId_fkey";

ALTER TABLE "Config" ADD COLUMN IF NOT EXISTS "env" VARCHAR(50);
ALTER TABLE "UserPassword" ADD COLUMN IF NOT EXISTS "env" VARCHAR(50);
ALTER TABLE "PhoneCode" ADD COLUMN IF NOT EXISTS "env" VARCHAR(50);
ALTER TABLE "EmailCode" ADD COLUMN IF NOT EXISTS "env" VARCHAR(50);

UPDATE "User" SET "phoneNumber" = NULL WHERE "phoneNumber" = '';
UPDATE "Articles" SET "title" = NULL WHERE "title" = '';

UPDATE "User"
SET
  "tenantId" = coalesce(nullif("tenantId", ''), 'helloworld'),
  "createdAt" = coalesce("createdAt", "registrationTime", "updatedAt", CURRENT_TIMESTAMP),
  "updatedAt" = coalesce("updatedAt", "lastLoginTime", "createdAt", "registrationTime", CURRENT_TIMESTAMP);

UPDATE "Articles"
SET
  "tenantId" = coalesce(nullif("tenantId", ''), 'helloworld'),
  "createdAt" = coalesce("createdAt", "updatedAt", CURRENT_TIMESTAMP),
  "updatedAt" = coalesce("updatedAt", "createdAt", CURRENT_TIMESTAMP);

UPDATE "Sentences"
SET
  "tenantId" = coalesce(nullif("tenantId", ''), 'helloworld'),
  "createdAt" = coalesce("createdAt", "updatedAt", CURRENT_TIMESTAMP),
  "updatedAt" = coalesce("updatedAt", "createdAt", CURRENT_TIMESTAMP);

UPDATE "Config"
SET
  "tenantId" = coalesce(nullif("tenantId", ''), 'helloworld'),
  "createdAt" = coalesce("createdAt", "updatedAt", CURRENT_TIMESTAMP),
  "updatedAt" = coalesce("updatedAt", "createdAt", CURRENT_TIMESTAMP);

UPDATE "UserPassword"
SET
  "tenantId" = coalesce(nullif("tenantId", ''), 'helloworld'),
  "createdAt" = coalesce("createdAt", "updatedAt", CURRENT_TIMESTAMP),
  "updatedAt" = coalesce("updatedAt", "createdAt", CURRENT_TIMESTAMP);

UPDATE "PhoneCode"
SET
  "tenantId" = coalesce(nullif("tenantId", ''), 'helloworld'),
  "createdAt" = coalesce("createdAt", "updatedAt", CURRENT_TIMESTAMP),
  "updatedAt" = coalesce("updatedAt", "createdAt", CURRENT_TIMESTAMP);

UPDATE "EmailCode"
SET
  "tenantId" = coalesce(nullif("tenantId", ''), 'helloworld'),
  "createdAt" = coalesce("createdAt", "updatedAt", CURRENT_TIMESTAMP),
  "updatedAt" = coalesce("updatedAt", "createdAt", CURRENT_TIMESTAMP);

UPDATE "Articles" AS a
SET "tenantId" = u."tenantId"
FROM "User" AS u
WHERE a."userId" = u."id"
  AND a."tenantId" <> u."tenantId";

UPDATE "Sentences" AS s
SET "tenantId" = a."tenantId"
FROM "Articles" AS a
WHERE s."articleId" = a."id"
  AND s."tenantId" <> a."tenantId";

ALTER TABLE "User" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "Articles" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "Sentences" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "Config" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "UserPassword" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "PhoneCode" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "EmailCode" ALTER COLUMN "id" DROP DEFAULT;

ALTER TABLE "User" ALTER COLUMN "id" TYPE uuid USING "__arrivo_pk_uuid_v7"('User', "id");
ALTER TABLE "Articles" ALTER COLUMN "id" TYPE uuid USING "__arrivo_pk_uuid_v7"('Articles', "id");
ALTER TABLE "Sentences" ALTER COLUMN "id" TYPE uuid USING "__arrivo_pk_uuid_v7"('Sentences', "id");
ALTER TABLE "Config" ALTER COLUMN "id" TYPE uuid USING "__arrivo_pk_uuid_v7"('Config', "id");
ALTER TABLE "UserPassword" ALTER COLUMN "id" TYPE uuid USING "__arrivo_pk_uuid_v7"('UserPassword', "id");
ALTER TABLE "PhoneCode" ALTER COLUMN "id" TYPE uuid USING "__arrivo_pk_uuid_v7"('PhoneCode', "id");
ALTER TABLE "EmailCode" ALTER COLUMN "id" TYPE uuid USING "__arrivo_pk_uuid_v7"('EmailCode', "id");

ALTER TABLE "Articles" ALTER COLUMN "userId" TYPE uuid USING "__arrivo_optional_uuid_v7"('User', "userId");
ALTER TABLE "Sentences" ALTER COLUMN "articleId" TYPE uuid USING "__arrivo_optional_uuid_v7"('Articles', "articleId");
ALTER TABLE "PhoneCode" ALTER COLUMN "userId" TYPE uuid USING "__arrivo_optional_uuid_v7"('User', "userId");
ALTER TABLE "EmailCode" ALTER COLUMN "userId" TYPE uuid USING "__arrivo_optional_uuid_v7"('User', "userId");

ALTER TABLE "User" ALTER COLUMN "deletedBy" TYPE uuid USING "__arrivo_optional_uuid_v7"('User', "deletedBy");
ALTER TABLE "User" ALTER COLUMN "createdBy" TYPE uuid USING "__arrivo_optional_uuid_v7"('User', "createdBy");
ALTER TABLE "User" ALTER COLUMN "updatedBy" TYPE uuid USING "__arrivo_optional_uuid_v7"('User', "updatedBy");
ALTER TABLE "User" ALTER COLUMN "teamId" TYPE uuid USING "__arrivo_optional_uuid_v7"('Team', "teamId");

ALTER TABLE "Articles" ALTER COLUMN "deletedBy" TYPE uuid USING "__arrivo_optional_uuid_v7"('User', "deletedBy");
ALTER TABLE "Articles" ALTER COLUMN "createdBy" TYPE uuid USING "__arrivo_optional_uuid_v7"('User', "createdBy");
ALTER TABLE "Articles" ALTER COLUMN "updatedBy" TYPE uuid USING "__arrivo_optional_uuid_v7"('User', "updatedBy");
ALTER TABLE "Articles" ALTER COLUMN "teamId" TYPE uuid USING "__arrivo_optional_uuid_v7"('Team', "teamId");

ALTER TABLE "Sentences" ALTER COLUMN "deletedBy" TYPE uuid USING "__arrivo_optional_uuid_v7"('User', "deletedBy");
ALTER TABLE "Sentences" ALTER COLUMN "createdBy" TYPE uuid USING "__arrivo_optional_uuid_v7"('User', "createdBy");
ALTER TABLE "Sentences" ALTER COLUMN "updatedBy" TYPE uuid USING "__arrivo_optional_uuid_v7"('User', "updatedBy");
ALTER TABLE "Sentences" ALTER COLUMN "teamId" TYPE uuid USING "__arrivo_optional_uuid_v7"('Team', "teamId");

ALTER TABLE "Config" ALTER COLUMN "deletedBy" TYPE uuid USING "__arrivo_optional_uuid_v7"('User', "deletedBy");
ALTER TABLE "Config" ALTER COLUMN "createdBy" TYPE uuid USING "__arrivo_optional_uuid_v7"('User', "createdBy");
ALTER TABLE "Config" ALTER COLUMN "updatedBy" TYPE uuid USING "__arrivo_optional_uuid_v7"('User', "updatedBy");
ALTER TABLE "Config" ALTER COLUMN "teamId" TYPE uuid USING "__arrivo_optional_uuid_v7"('Team', "teamId");

ALTER TABLE "UserPassword" ALTER COLUMN "deletedBy" TYPE uuid USING "__arrivo_optional_uuid_v7"('User', "deletedBy");
ALTER TABLE "UserPassword" ALTER COLUMN "createdBy" TYPE uuid USING "__arrivo_optional_uuid_v7"('User', "createdBy");
ALTER TABLE "UserPassword" ALTER COLUMN "updatedBy" TYPE uuid USING "__arrivo_optional_uuid_v7"('User', "updatedBy");
ALTER TABLE "UserPassword" ALTER COLUMN "teamId" TYPE uuid USING "__arrivo_optional_uuid_v7"('Team', "teamId");

ALTER TABLE "PhoneCode" ALTER COLUMN "deletedBy" TYPE uuid USING "__arrivo_optional_uuid_v7"('User', "deletedBy");
ALTER TABLE "PhoneCode" ALTER COLUMN "createdBy" TYPE uuid USING "__arrivo_optional_uuid_v7"('User', "createdBy");
ALTER TABLE "PhoneCode" ALTER COLUMN "updatedBy" TYPE uuid USING "__arrivo_optional_uuid_v7"('User', "updatedBy");
ALTER TABLE "PhoneCode" ALTER COLUMN "teamId" TYPE uuid USING "__arrivo_optional_uuid_v7"('Team', "teamId");

ALTER TABLE "EmailCode" ALTER COLUMN "deletedBy" TYPE uuid USING "__arrivo_optional_uuid_v7"('User', "deletedBy");
ALTER TABLE "EmailCode" ALTER COLUMN "createdBy" TYPE uuid USING "__arrivo_optional_uuid_v7"('User', "createdBy");
ALTER TABLE "EmailCode" ALTER COLUMN "updatedBy" TYPE uuid USING "__arrivo_optional_uuid_v7"('User', "updatedBy");
ALTER TABLE "EmailCode" ALTER COLUMN "teamId" TYPE uuid USING "__arrivo_optional_uuid_v7"('Team', "teamId");

ALTER TABLE "User" ALTER COLUMN "tenantId" TYPE VARCHAR(50), ALTER COLUMN "tenantId" SET DEFAULT 'helloworld', ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Articles" ALTER COLUMN "tenantId" TYPE VARCHAR(50), ALTER COLUMN "tenantId" SET DEFAULT 'helloworld', ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Sentences" ALTER COLUMN "tenantId" TYPE VARCHAR(50), ALTER COLUMN "tenantId" SET DEFAULT 'helloworld', ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Config" ALTER COLUMN "tenantId" TYPE VARCHAR(50), ALTER COLUMN "tenantId" SET DEFAULT 'helloworld', ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "UserPassword" ALTER COLUMN "tenantId" TYPE VARCHAR(50), ALTER COLUMN "tenantId" SET DEFAULT 'helloworld', ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "PhoneCode" ALTER COLUMN "tenantId" TYPE VARCHAR(50), ALTER COLUMN "tenantId" SET DEFAULT 'helloworld', ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "EmailCode" ALTER COLUMN "tenantId" TYPE VARCHAR(50), ALTER COLUMN "tenantId" SET DEFAULT 'helloworld', ALTER COLUMN "tenantId" SET NOT NULL;

ALTER TABLE "User" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP, ALTER COLUMN "createdAt" SET NOT NULL, ALTER COLUMN "updatedAt" SET NOT NULL;
ALTER TABLE "Articles" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP, ALTER COLUMN "createdAt" SET NOT NULL, ALTER COLUMN "updatedAt" SET NOT NULL;
ALTER TABLE "Sentences" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP, ALTER COLUMN "createdAt" SET NOT NULL, ALTER COLUMN "updatedAt" SET NOT NULL;
ALTER TABLE "Config" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP, ALTER COLUMN "createdAt" SET NOT NULL, ALTER COLUMN "updatedAt" SET NOT NULL;
ALTER TABLE "UserPassword" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP, ALTER COLUMN "createdAt" SET NOT NULL, ALTER COLUMN "updatedAt" SET NOT NULL;
ALTER TABLE "PhoneCode" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP, ALTER COLUMN "createdAt" SET NOT NULL, ALTER COLUMN "updatedAt" SET NOT NULL;
ALTER TABLE "EmailCode" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP, ALTER COLUMN "createdAt" SET NOT NULL, ALTER COLUMN "updatedAt" SET NOT NULL;

ALTER TABLE "User" ALTER COLUMN "id" SET DEFAULT uuidv7();
ALTER TABLE "Articles" ALTER COLUMN "id" SET DEFAULT uuidv7();
ALTER TABLE "Sentences" ALTER COLUMN "id" SET DEFAULT uuidv7();
ALTER TABLE "Config" ALTER COLUMN "id" SET DEFAULT uuidv7();
ALTER TABLE "UserPassword" ALTER COLUMN "id" SET DEFAULT uuidv7();
ALTER TABLE "PhoneCode" ALTER COLUMN "id" SET DEFAULT uuidv7();
ALTER TABLE "EmailCode" ALTER COLUMN "id" SET DEFAULT uuidv7();

ALTER TABLE "Articles" ADD CONSTRAINT "Articles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Sentences" ADD CONSTRAINT "Sentences_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Articles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "User_tenantId_phoneNumber_key" ON "User"("tenantId", "phoneNumber");
CREATE INDEX "User_tenantId_deletedAt_idx" ON "User"("tenantId", "deletedAt");
CREATE INDEX "User_tenantId_updatedAt_idx" ON "User"("tenantId", "updatedAt");

CREATE UNIQUE INDEX "Articles_tenantId_userId_title_key" ON "Articles"("tenantId", "userId", "title");
CREATE INDEX "Articles_tenantId_userId_createdAt_idx" ON "Articles"("tenantId", "userId", "createdAt");
CREATE INDEX "Articles_tenantId_deletedAt_idx" ON "Articles"("tenantId", "deletedAt");

CREATE INDEX "Sentences_tenantId_articleId_createdAt_idx" ON "Sentences"("tenantId", "articleId", "createdAt");
CREATE INDEX "Sentences_tenantId_deletedAt_idx" ON "Sentences"("tenantId", "deletedAt");

CREATE UNIQUE INDEX "Config_tenantId_key_key" ON "Config"("tenantId", "key");
CREATE INDEX "Config_tenantId_deletedAt_idx" ON "Config"("tenantId", "deletedAt");

CREATE INDEX "UserPassword_tenantId_deletedAt_idx" ON "UserPassword"("tenantId", "deletedAt");

CREATE INDEX "PhoneCode_tenantId_toPhoneNumber_createdAt_idx" ON "PhoneCode"("tenantId", "toPhoneNumber", "createdAt");
CREATE INDEX "PhoneCode_tenantId_deletedAt_idx" ON "PhoneCode"("tenantId", "deletedAt");

CREATE INDEX "EmailCode_tenantId_toEmail_createdAt_idx" ON "EmailCode"("tenantId", "toEmail", "createdAt");
CREATE INDEX "EmailCode_tenantId_deletedAt_idx" ON "EmailCode"("tenantId", "deletedAt");

DROP FUNCTION "__arrivo_optional_uuid_v7"(text, text);
DROP FUNCTION "__arrivo_pk_uuid_v7"(text, text);
