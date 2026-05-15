import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";

type CreatePayload = {
  trainingId: string;
  athleteId: string;
  rating: number;
  comment?: string;
};

export const trainingFeedbackService = {
  async upsert(payload: CreatePayload) {
    if (!payload.trainingId || !payload.athleteId) {
      throw new AppError("trainingId e athleteId são obrigatórios", 400);
    }
    if (typeof payload.rating !== "number" || payload.rating < 1 || payload.rating > 5) {
      throw new AppError("Nota deve ser entre 1 e 5", 400);
    }

    return prisma.trainingFeedback.upsert({
      where: { trainingId_athleteId: { trainingId: payload.trainingId, athleteId: payload.athleteId } },
      update: {
        rating: payload.rating,
        comment: payload.comment?.trim() ?? null,
      },
      create: {
        trainingId: payload.trainingId,
        athleteId: payload.athleteId,
        rating: payload.rating,
        comment: payload.comment?.trim() ?? null,
      },
    });
  },

  async findByTraining(trainingId: string) {
    return prisma.trainingFeedback.findMany({
      where: { trainingId },
      include: { athlete: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

  async findByAthlete(athleteId: string) {
    return prisma.trainingFeedback.findMany({
      where: { athleteId },
      include: { training: { select: { id: true, title: true, date: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

  async getMyFeedback(trainingId: string, athleteId: string) {
    return prisma.trainingFeedback.findUnique({
      where: { trainingId_athleteId: { trainingId, athleteId } },
    });
  },
};
