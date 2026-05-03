import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";
import { notificationsService } from "../notifications/notifications.service";

type SelfEvaluationPayload = {
  improvements?: string | null;
  selfRating?: number | string | null;
  strengths?: string | null;
};

type CoachEvaluationPayload = {
  coachNotes?: string | null;
  mental?: number | string | null;
  physical?: number | string | null;
  tactical?: number | string | null;
  technical?: number | string | null;
};

function normalizeOptional(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseRating(value: number | string | null | undefined, field: string) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  const rating = Number(value);

  if (!Number.isFinite(rating) || rating < 0 || rating > 10) {
    throw new AppError(`${field} deve ser uma nota de 0 a 10`, 400);
  }

  return rating;
}

function calculateOverall(evaluation?: {
  mental: number | null;
  physical: number | null;
  tactical: number | null;
  technical: number | null;
} | null) {
  if (!evaluation) return null;

  const ratings = [
    evaluation.technical,
    evaluation.physical,
    evaluation.tactical,
    evaluation.mental,
  ].filter((rating): rating is number => typeof rating === "number");

  if (ratings.length === 0) return null;

  return Number((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1));
}

export function formatEvaluation(evaluation: Awaited<ReturnType<typeof getEvaluationByAthleteId>>) {
  if (!evaluation) {
    return {
      coachNotes: null,
      createdAt: null,
      id: null,
      improvements: null,
      mental: null,
      overall: null,
      physical: null,
      selfRating: null,
      strengths: null,
      tactical: null,
      technical: null,
      updatedAt: null,
    };
  }

  return {
    ...evaluation,
    overall: calculateOverall(evaluation),
  };
}

async function getEvaluationByAthleteId(athleteId: string) {
  return prisma.athleteEvaluation.findUnique({
    where: { athleteId },
  });
}

async function getAthleteForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { athlete: true },
  });

  if (!user?.athlete) {
    throw new AppError("Seu usuario nao esta vinculado a um atleta.", 403);
  }

  return user.athlete;
}

async function ensureAthlete(athleteId: string) {
  const athlete = await prisma.athlete.findUnique({
    where: { id: athleteId },
  });

  if (!athlete) {
    throw new AppError("Atleta nao encontrado", 404);
  }

  return athlete;
}

export const evaluationsService = {
  async getMyEvaluation(userId: string) {
    const athlete = await getAthleteForUser(userId);
    return formatEvaluation(await getEvaluationByAthleteId(athlete.id));
  },

  async updateSelfEvaluation(userId: string, payload: SelfEvaluationPayload) {
    const athlete = await getAthleteForUser(userId);
    const data = {
      improvements: normalizeOptional(payload.improvements),
      selfRating: parseRating(payload.selfRating, "Autoavaliacao"),
      strengths: normalizeOptional(payload.strengths),
    };

    const evaluation = await prisma.athleteEvaluation.upsert({
      where: { athleteId: athlete.id },
      create: {
        athleteId: athlete.id,
        ...data,
      },
      update: data,
    });

    return formatEvaluation(evaluation);
  },

  async getEvaluation(athleteId: string) {
    await ensureAthlete(athleteId);
    return formatEvaluation(await getEvaluationByAthleteId(athleteId));
  },

  async updateCoachEvaluation(athleteId: string, payload: CoachEvaluationPayload) {
    await ensureAthlete(athleteId);

    const data = {
      coachNotes: normalizeOptional(payload.coachNotes),
      mental: parseRating(payload.mental, "Mental"),
      physical: parseRating(payload.physical, "Fisico"),
      tactical: parseRating(payload.tactical, "Tatico"),
      technical: parseRating(payload.technical, "Tecnica"),
    };

    const evaluation = await prisma.athleteEvaluation.upsert({
      where: { athleteId },
      create: {
        athleteId,
        ...data,
      },
      update: data,
    });

    const athleteUser = await prisma.user.findUnique({
      where: { athleteId },
      select: { id: true },
    });

    await notificationsService.createForUser(athleteUser?.id, {
      message: "Você recebeu uma nova avaliação técnica.",
      title: "Nova avaliação técnica",
      type: "avaliacao",
    });

    return formatEvaluation(evaluation);
  },
};
