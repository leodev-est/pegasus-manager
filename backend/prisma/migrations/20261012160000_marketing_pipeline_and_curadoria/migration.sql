-- AlterTable
ALTER TABLE "User" ADD COLUMN "marketingFunctions" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "links" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "ContentItem" ADD COLUMN "format" TEXT NOT NULL DEFAULT 'video',
ADD COLUMN "links" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "assignedTo" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "links" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "ReferenceVideo" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'instagram',
    "title" TEXT NOT NULL,
    "note" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'nova',
    "addedBy" TEXT NOT NULL,
    "contentItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceVideo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReferenceVideo_status_idx" ON "ReferenceVideo"("status");

-- CreateIndex
CREATE INDEX "ReferenceVideo_createdAt_idx" ON "ReferenceVideo"("createdAt");

-- CreateIndex
CREATE INDEX "ReferenceVideo_contentItemId_idx" ON "ReferenceVideo"("contentItemId");

-- AddForeignKey
ALTER TABLE "ReferenceVideo" ADD CONSTRAINT "ReferenceVideo_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
