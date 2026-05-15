-- AlterTable: User
ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT,
ADD COLUMN "googleRefreshToken" TEXT,
ADD COLUMN "googleCalendarId" TEXT;

-- AlterTable: Athlete
ALTER TABLE "Athlete" ADD COLUMN "birthDate" TIMESTAMP(3),
ADD COLUMN "gender" TEXT;

-- AlterTable: AthleteApplication
ALTER TABLE "AthleteApplication" ADD COLUMN "athleteId" TEXT;
ALTER TABLE "AthleteApplication" ADD CONSTRAINT "AthleteApplication_athleteId_key" UNIQUE ("athleteId");
ALTER TABLE "AthleteApplication" ADD CONSTRAINT "AthleteApplication_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: AthleteEvaluation (drop unique, add evaluatedBy, add index)
DROP INDEX IF EXISTS "AthleteEvaluation_athleteId_key";
ALTER TABLE "AthleteEvaluation" ADD COLUMN "evaluatedBy" TEXT;
CREATE INDEX "AthleteEvaluation_athleteId_idx" ON "AthleteEvaluation"("athleteId");

-- AlterTable: Payment
ALTER TABLE "Payment" ADD COLUMN "referenceMonth" TEXT;

-- AlterTable: Training
ALTER TABLE "Training" ADD COLUMN "googleEventId" TEXT;

-- AlterTable: TrainingSetting
ALTER TABLE "TrainingSetting"
ADD COLUMN "blockedDateEventIds" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN "trainingDaysOfWeek" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "trainingDuration" INTEGER NOT NULL DEFAULT 90,
ADD COLUMN "defaultTrainingCategory" TEXT NOT NULL DEFAULT 'geral',
ADD COLUMN "overduePaymentDays" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN "maxAbsencesPercentage" DOUBLE PRECISION NOT NULL DEFAULT 25,
ADD COLUMN "minAttendanceToEvaluate" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN "notifyOnApproval" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "notifyOnOverdue" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "notifyOnTraining" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "systemName" TEXT NOT NULL DEFAULT 'Pegasus Manager',
ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
ADD COLUMN "googleCalendarId" TEXT,
ADD COLUMN "googleRefreshToken" TEXT,
ADD COLUMN "pixKey" TEXT,
ADD COLUMN "pixProvider" TEXT,
ADD COLUMN "pixApiKey" TEXT,
ADD COLUMN "pixWebhookSecret" TEXT,
ADD COLUMN "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "emailFallbackEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "emailHost" TEXT,
ADD COLUMN "emailPort" INTEGER,
ADD COLUMN "emailSecure" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "emailUser" TEXT,
ADD COLUMN "emailPassword" TEXT,
ADD COLUMN "emailFrom" TEXT,
ADD COLUMN "emailFromName" TEXT NOT NULL DEFAULT 'Pegasus Manager';

-- CreateTable: AnnouncementTemplate
CREATE TABLE "AnnouncementTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AnnouncementTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ScheduledAnnouncement
CREATE TABLE "ScheduledAnnouncement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "target" TEXT NOT NULL DEFAULT 'active',
    "channel" TEXT NOT NULL DEFAULT 'both',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ScheduledAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PaymentStatusHistory
CREATE TABLE "PaymentStatusHistory" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PaymentStatusHistory_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "PaymentStatusHistory" ADD CONSTRAINT "PaymentStatusHistory_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: Game
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "opponent" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "scorePegasus" INTEGER NOT NULL,
    "scoreOpponent" INTEGER NOT NULL,
    "result" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable: GameSet
CREATE TABLE "GameSet" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "scorePegasus" INTEGER NOT NULL,
    "scoreOpponent" INTEGER NOT NULL,
    CONSTRAINT "GameSet_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "GameSet" ADD CONSTRAINT "GameSet_gameId_setNumber_key" UNIQUE ("gameId", "setNumber");
ALTER TABLE "GameSet" ADD CONSTRAINT "GameSet_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: UniformItem
CREATE TABLE "UniformItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UniformItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable: UniformDelivery
CREATE TABLE "UniformDelivery" (
    "id" TEXT NOT NULL,
    "uniformItemId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "deliveredBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UniformDelivery_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "UniformDelivery" ADD CONSTRAINT "UniformDelivery_uniformItemId_fkey" FOREIGN KEY ("uniformItemId") REFERENCES "UniformItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UniformDelivery" ADD CONSTRAINT "UniformDelivery_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: JerseyAssignment
CREATE TABLE "JerseyAssignment" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "gender" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    CONSTRAINT "JerseyAssignment_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "JerseyAssignment" ADD CONSTRAINT "JerseyAssignment_athleteId_key" UNIQUE ("athleteId");
ALTER TABLE "JerseyAssignment" ADD CONSTRAINT "JerseyAssignment_number_gender_key" UNIQUE ("number", "gender");
ALTER TABLE "JerseyAssignment" ADD CONSTRAINT "JerseyAssignment_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: PushSubscription
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_endpoint_key" UNIQUE ("endpoint");
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: MonthlyReport
CREATE TABLE "MonthlyReport" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "content" BYTEA NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    CONSTRAINT "MonthlyReport_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "MonthlyReport" ADD CONSTRAINT "MonthlyReport_month_key" UNIQUE ("month");

-- CreateTable: AuditLog
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
