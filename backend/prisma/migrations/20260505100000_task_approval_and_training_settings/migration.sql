-- AlterTable: add approval fields to Task
ALTER TABLE "Task" ADD COLUMN "approvalStatus" TEXT;
ALTER TABLE "Task" ADD COLUMN "scheduledAt" TIMESTAMP(3);

-- CreateTable: TrainingSetting for calendar blocked dates
CREATE TABLE "TrainingSetting" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "blockedDates" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrainingSetting_pkey" PRIMARY KEY ("id")
);
