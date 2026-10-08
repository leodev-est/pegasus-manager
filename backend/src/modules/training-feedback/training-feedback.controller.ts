import type { RequestHandler } from "express";
import { trainingFeedbackService } from "./training-feedback.service";
import { AppError } from "../../middlewares/error.middleware";

export const trainingFeedbackController = {
  upsert: (async (req, res, next) => {
    try {
      const { trainingId, rating, comment } = req.body as {
        trainingId: string;
        rating: number;
        comment?: string;
      };

      const athleteId = req.user?.athleteId;
      if (!athleteId) throw new AppError("Perfil de atleta não encontrado", 403);

      res.json(await trainingFeedbackService.upsert({ trainingId, athleteId, rating, comment }));
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  findByTraining: (async (req, res, next) => {
    try {
      // Lista o feedback de TODOS os atletas naquele treino — só pra staff, nunca pra
      // um atleta comum (que tem trainings:read e passaria no permissionMiddleware da rota).
      const isStaff = req.user?.permissions.includes("athletes:read") ?? false;
      if (!isStaff) throw new AppError("Permissão insuficiente", 403);
      res.json(await trainingFeedbackService.findByTraining(req.params.trainingId));
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  findByAthlete: (async (req, res, next) => {
    try {
      const requestedAthleteId = req.params.athleteId;
      const isSelf = req.user?.athleteId === requestedAthleteId;
      const isStaff = req.user?.permissions.includes("athletes:read") ?? false;
      if (!isSelf && !isStaff) throw new AppError("Permissão insuficiente", 403);
      res.json(await trainingFeedbackService.findByAthlete(requestedAthleteId));
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  getMyFeedback: (async (req, res, next) => {
    try {
      const athleteId = req.user?.athleteId;
      if (!athleteId) throw new AppError("Perfil de atleta não encontrado", 403);

      const feedback = await trainingFeedbackService.getMyFeedback(req.params.trainingId, athleteId);
      res.json(feedback ?? null);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,
};
