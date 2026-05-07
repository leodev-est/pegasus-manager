-- DropIndex
DROP INDEX "Notification_userId_createdAt_idx";

-- AlterTable
ALTER TABLE "AthleteApplication" ADD COLUMN     "availableSaturdays" BOOLEAN,
ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "currentTeam" BOOLEAN,
ADD COLUMN     "currentTeamName" TEXT,
ADD COLUMN     "experienceTime" TEXT,
ADD COLUMN     "howFound" TEXT,
ADD COLUMN     "level" TEXT,
ADD COLUMN     "motivation" TEXT,
ADD COLUMN     "referral" TEXT,
ADD COLUMN     "willingToCompete" BOOLEAN;

-- AlterTable
ALTER TABLE "TrainingSetting" ALTER COLUMN "blockedDates" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;
