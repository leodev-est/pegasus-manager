CREATE TABLE "GameConvocation" (
    "id"        TEXT NOT NULL,
    "gameId"    TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "status"    TEXT NOT NULL DEFAULT 'convocado',
    "notes"     TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameConvocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GameConvocation_gameId_athleteId_key" ON "GameConvocation"("gameId", "athleteId");
CREATE INDEX "GameConvocation_gameId_idx" ON "GameConvocation"("gameId");
CREATE INDEX "GameConvocation_athleteId_idx" ON "GameConvocation"("athleteId");

ALTER TABLE "GameConvocation" ADD CONSTRAINT "GameConvocation_gameId_fkey"
  FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GameConvocation" ADD CONSTRAINT "GameConvocation_athleteId_fkey"
  FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;
