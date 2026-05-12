-- AlterTable
ALTER TABLE "TrainingSetting" ADD COLUMN     "monthlyFeeAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "trainingDependency" TEXT NOT NULL DEFAULT 'Quadra - CREC',
ADD COLUMN     "trainingLocation" TEXT NOT NULL DEFAULT 'Jerusalém',
ADD COLUMN     "trainingTime" TEXT NOT NULL DEFAULT '17:30 às 19:00';
