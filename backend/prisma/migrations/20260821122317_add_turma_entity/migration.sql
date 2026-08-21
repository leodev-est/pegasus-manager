/*
  Warnings:

  - You are about to drop the column `gender` on the `AthleteApplication` table. All the data in the column will be lost.
  - You are about to drop the column `gender` on the `Training` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Athlete" ADD COLUMN     "turmaId" TEXT;

-- AlterTable
ALTER TABLE "AthleteApplication" DROP COLUMN "gender",
ADD COLUMN     "turmaId" TEXT;

-- AlterTable
ALTER TABLE "Training" DROP COLUMN "gender",
ADD COLUMN     "turmaId" TEXT;

-- CreateTable
CREATE TABLE "Turma" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "daysOfWeek" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "time" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "dependency" TEXT,
    "color" TEXT NOT NULL DEFAULT '#0D47A1',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "startDate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Turma_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Athlete_turmaId_idx" ON "Athlete"("turmaId");

-- CreateIndex
CREATE INDEX "AthleteApplication_turmaId_idx" ON "AthleteApplication"("turmaId");

-- CreateIndex
CREATE INDEX "Training_turmaId_idx" ON "Training"("turmaId");

-- AddForeignKey
ALTER TABLE "Athlete" ADD CONSTRAINT "Athlete_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteApplication" ADD CONSTRAINT "AthleteApplication_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Training" ADD CONSTRAINT "Training_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma"("id") ON DELETE SET NULL ON UPDATE CASCADE;
