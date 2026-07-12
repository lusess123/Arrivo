ALTER TABLE "Sentences"
ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT
    "id",
    ((ROW_NUMBER() OVER (
      PARTITION BY "tenantId", "articleId"
      ORDER BY "createdAt" ASC, "id" ASC
    ) - 1) * 1000 + 1000) AS "nextSortOrder"
  FROM "Sentences"
  WHERE "articleId" IS NOT NULL
)
UPDATE "Sentences"
SET "sortOrder" = ranked."nextSortOrder"
FROM ranked
WHERE "Sentences"."id" = ranked."id";

CREATE INDEX IF NOT EXISTS "Sentences_tenantId_articleId_sortOrder_idx"
ON "Sentences"("tenantId", "articleId", "sortOrder");
