-- CreateEnum
CREATE TYPE "MindTaskStatus" AS ENUM ('IN_PROGRESS', 'WAITING', 'PAUSED', 'DONE');

-- CreateEnum
CREATE TYPE "MindNoteType" AS ENUM ('IDEA', 'CONCERN', 'INSPIRATION', 'OTHER');

-- CreateTable
CREATE TABLE "MindWorkspace" (
    "tenantId" VARCHAR(50) NOT NULL,
    "userId" UUID NOT NULL,
    "currentTaskId" UUID,
    "revision" UUID NOT NULL,

    CONSTRAINT "MindWorkspace_pkey" PRIMARY KEY ("tenantId","userId")
);

-- CreateTable
CREATE TABLE "MindTask" (
    "tenantId" VARCHAR(50) NOT NULL,
    "userId" UUID NOT NULL,
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "status" "MindTaskStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "lastContext" TEXT,
    "nextAction" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MindTask_pkey" PRIMARY KEY ("tenantId","userId","id")
);

-- CreateTable
CREATE TABLE "MindNote" (
    "tenantId" VARCHAR(50) NOT NULL,
    "userId" UUID NOT NULL,
    "id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "type" "MindNoteType" NOT NULL DEFAULT 'OTHER',
    "taskId" UUID,
    "setAside" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MindNote_pkey" PRIMARY KEY ("tenantId","userId","id")
);

-- CreateTable
CREATE TABLE "MindAction" (
    "tenantId" VARCHAR(50) NOT NULL,
    "userId" UUID NOT NULL,
    "id" UUID NOT NULL,
    "taskId" UUID,
    "noteId" UUID,
    "title" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "dueOn" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MindAction_pkey" PRIMARY KEY ("tenantId","userId","id")
);

-- CreateIndex
CREATE INDEX "MindNote_tenantId_userId_taskId_idx" ON "MindNote"("tenantId", "userId", "taskId");

-- CreateIndex
CREATE INDEX "MindAction_tenantId_userId_taskId_idx" ON "MindAction"("tenantId", "userId", "taskId");

-- CreateIndex
CREATE INDEX "MindAction_tenantId_userId_noteId_idx" ON "MindAction"("tenantId", "userId", "noteId");

-- AddForeignKey
ALTER TABLE "MindWorkspace" ADD CONSTRAINT "MindWorkspace_tenantId_userId_currentTaskId_fkey" FOREIGN KEY ("tenantId", "userId", "currentTaskId") REFERENCES "MindTask"("tenantId", "userId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MindNote" ADD CONSTRAINT "MindNote_tenantId_userId_taskId_fkey" FOREIGN KEY ("tenantId", "userId", "taskId") REFERENCES "MindTask"("tenantId", "userId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MindAction" ADD CONSTRAINT "MindAction_tenantId_userId_taskId_fkey" FOREIGN KEY ("tenantId", "userId", "taskId") REFERENCES "MindTask"("tenantId", "userId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MindAction" ADD CONSTRAINT "MindAction_tenantId_userId_noteId_fkey" FOREIGN KEY ("tenantId", "userId", "noteId") REFERENCES "MindNote"("tenantId", "userId", "id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Each action belongs to exactly one task or note.
ALTER TABLE "MindAction"
  ADD CONSTRAINT "MindAction_has_one_parent"
  CHECK (("taskId" IS NULL) <> ("noteId" IS NULL));
