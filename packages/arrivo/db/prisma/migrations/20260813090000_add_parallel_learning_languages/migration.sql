ALTER TABLE "Sentences"
  ADD COLUMN "languageCode" VARCHAR(10) NOT NULL DEFAULT 'en',
  ADD COLUMN "sentenceGroupId" UUID;

WITH RECURSIVE sentence_roots AS (
  SELECT "id", "id" AS "rootId"
  FROM "Sentences"
  WHERE "parentSentenceId" IS NULL

  UNION ALL

  SELECT child."id", roots."rootId"
  FROM "Sentences" child
  INNER JOIN sentence_roots roots ON child."parentSentenceId" = roots."id"
)
UPDATE "Sentences" sentence
SET "sentenceGroupId" = roots."rootId"
FROM sentence_roots roots
WHERE sentence."id" = roots."id";

UPDATE "Sentences"
SET "sentenceGroupId" = "id"
WHERE "sentenceGroupId" IS NULL;

CREATE OR REPLACE FUNCTION "set_sentences_group_id_from_id"()
RETURNS trigger AS $$
BEGIN
  IF NEW."sentenceGroupId" IS NULL THEN
    NEW."sentenceGroupId" := NEW."id";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Sentences_default_sentenceGroupId"
  BEFORE INSERT ON "Sentences"
  FOR EACH ROW
  EXECUTE FUNCTION "set_sentences_group_id_from_id"();

ALTER TABLE "Sentences"
  ALTER COLUMN "sentenceGroupId" SET NOT NULL;

CREATE INDEX "Sentences_tenantId_articleId_languageCode_sortOrder_idx"
  ON "Sentences"("tenantId", "articleId", "languageCode", "sortOrder");

CREATE INDEX "Sentences_tenantId_sentenceGroupId_languageCode_idx"
  ON "Sentences"("tenantId", "sentenceGroupId", "languageCode");

CREATE UNIQUE INDEX "Sentences_active_root_language_key"
  ON "Sentences"("tenantId", "articleId", "sentenceGroupId", "languageCode")
  WHERE "parentSentenceId" IS NULL AND "deletedAt" IS NULL;
