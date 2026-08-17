-- AlterTable
ALTER TABLE "Training" ADD COLUMN     "gender" TEXT;

-- AlterTable
ALTER TABLE "TrainingSetting" ADD COLUMN     "trainingTimeFemale" TEXT NOT NULL DEFAULT '16:00 às 17:30',
ADD COLUMN     "trainingTimeMale" TEXT NOT NULL DEFAULT '17:30 às 19:00';
