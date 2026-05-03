CREATE TABLE "TrainingAttendance" (
    "id" TEXT NOT NULL,
    "trainingId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'presente',
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingAttendance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TrainingAttendance_trainingId_athleteId_key" ON "TrainingAttendance"("trainingId", "athleteId");

ALTER TABLE "TrainingAttendance" ADD CONSTRAINT "TrainingAttendance_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "Training"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TrainingAttendance" ADD CONSTRAINT "TrainingAttendance_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;
