import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";
import { isBlockedTrainingDate, loadBlockedDates } from "../../utils/trainingDates";
import { notificationsService } from "../notifications/notifications.service";

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

    const training = await prisma.training.findUnique({
      where: { id: payload.trainingId },
      select: { title: true, date: true },
    });
    if (!training) throw new AppError("Treino não encontrado", 404);

    const blockedDates = await loadBlockedDates();
    if (isBlockedTrainingDate(training.date, blockedDates)) {
      throw new AppError("Não é possível avaliar um treino cancelado.", 400);
    }

    const feedback = await prisma.trainingFeedback.upsert({
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
      include: { athlete: { select: { name: true } } },
    });

    notificationsService
      .notifyByRoles(["Diretor", "Tecnico"], {
        title: "Treino avaliado",
        message: `${feedback.athlete.name} avaliou "${training.title}" com nota ${payload.rating}.`,
        type: "avaliacao_treino",
        meta: JSON.stringify({ trainingId: payload.trainingId, athleteId: payload.athleteId }),
      })
      .catch(() => {});

    return feedback;
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
