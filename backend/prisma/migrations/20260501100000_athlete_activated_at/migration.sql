ALTER TABLE "Athlete" ADD COLUMN "activatedAt" TIMESTAMP(3);

UPDATE "Athlete"
SET "activatedAt" = GREATEST("createdAt", TIMESTAMP '2026-04-25 00:00:00')
WHERE "status" = 'ativo';
