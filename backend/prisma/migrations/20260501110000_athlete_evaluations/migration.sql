CREATE TABLE "AthleteEvaluation" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "selfRating" DOUBLE PRECISION,
    "strengths" TEXT,
    "improvements" TEXT,
    "technical" DOUBLE PRECISION,
    "physical" DOUBLE PRECISION,
    "tactical" DOUBLE PRECISION,
    "mental" DOUBLE PRECISION,
    "coachNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteEvaluation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AthleteEvaluation_athleteId_key" ON "AthleteEvaluation"("athleteId");

ALTER TABLE "AthleteEvaluation" ADD CONSTRAINT "AthleteEvaluation_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;
