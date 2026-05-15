-- CreateTable
CREATE TABLE "Suggestion" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT,
    "authorName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "response" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Suggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingFeedback" (
    "id" TEXT NOT NULL,
    "trainingId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Suggestion_status_idx" ON "Suggestion"("status");

-- CreateIndex
CREATE INDEX "Suggestion_createdAt_idx" ON "Suggestion"("createdAt");

-- CreateIndex
CREATE INDEX "TrainingFeedback_trainingId_idx" ON "TrainingFeedback"("trainingId");

-- CreateIndex
CREATE INDEX "TrainingFeedback_athleteId_idx" ON "TrainingFeedback"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingFeedback_trainingId_athleteId_key" ON "TrainingFeedback"("trainingId", "athleteId");

-- AddForeignKey
ALTER TABLE "TrainingFeedback" ADD CONSTRAINT "TrainingFeedback_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "Training"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingFeedback" ADD CONSTRAINT "TrainingFeedback_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;
