UPDATE "User"
SET "email" = NULL
WHERE "email" IS NOT NULL
  AND btrim("email") = '';

UPDATE "User"
SET "email" = lower(btrim("email"))
WHERE "email" IS NOT NULL
  AND "email" <> lower(btrim("email"));

WITH ranked_email AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "tenantId", "email"
      ORDER BY "createdAt" ASC, "id" ASC
    ) AS rn
  FROM "User"
  WHERE "email" IS NOT NULL
)
UPDATE "User"
SET "email" = NULL
WHERE "id" IN (
  SELECT "id"
  FROM ranked_email
  WHERE rn > 1
);

ALTER TABLE "EmailCode"
ADD COLUMN IF NOT EXISTS "purpose" VARCHAR(40),
ADD COLUMN IF NOT EXISTS "usedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "User_tenantId_email_idx"
ON "User"("tenantId", "email");

CREATE UNIQUE INDEX IF NOT EXISTS "User_tenantId_email_unique_not_null_idx"
ON "User"("tenantId", "email")
WHERE "email" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "EmailCode_tenantId_code_purpose_idx"
ON "EmailCode"("tenantId", "code", "purpose");

CREATE INDEX IF NOT EXISTS "EmailCode_tenantId_toEmail_purpose_createdAt_idx"
ON "EmailCode"("tenantId", "toEmail", "purpose", "createdAt");
