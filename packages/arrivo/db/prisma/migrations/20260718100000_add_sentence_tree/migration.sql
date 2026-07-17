ALTER TABLE "Sentences"
ADD COLUMN IF NOT EXISTS "parentSentenceId" UUID,
ADD COLUMN IF NOT EXISTS "splitStatus" VARCHAR(20) NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN IF NOT EXISTS "splitAnalyzedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "splitModel" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "splitVersion" VARCHAR(50);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Sentences_parentSentenceId_fkey'
  ) THEN
    ALTER TABLE "Sentences"
    ADD CONSTRAINT "Sentences_parentSentenceId_fkey"
    FOREIGN KEY ("parentSentenceId") REFERENCES "Sentences"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Sentences_tenantId_parentSentenceId_sortOrder_idx"
ON "Sentences"("tenantId", "parentSentenceId", "sortOrder");
