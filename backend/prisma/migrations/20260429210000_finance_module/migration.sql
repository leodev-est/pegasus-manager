-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "description" TEXT NOT NULL DEFAULT 'Pagamento';
ALTER TABLE "Payment" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'receita';
ALTER TABLE "Payment" ADD COLUMN "category" TEXT;
ALTER TABLE "Payment" ALTER COLUMN "athleteId" DROP NOT NULL;
ALTER TABLE "Payment" ALTER COLUMN "dueDate" DROP NOT NULL;
ALTER TABLE "Payment" ALTER COLUMN "description" DROP DEFAULT;
ALTER TABLE "Payment" ALTER COLUMN "type" DROP DEFAULT;

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_athleteId_fkey";

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "CashMovement" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "responsible" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashMovement_pkey" PRIMARY KEY ("id")
);
