ALTER TABLE "Articles"
ADD COLUMN IF NOT EXISTS "isPublic" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Articles_tenantId_isPublic_createdAt_idx"
ON "Articles"("tenantId", "isPublic", "createdAt");
