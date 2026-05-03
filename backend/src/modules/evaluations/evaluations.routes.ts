import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { AppError } from "../../middlewares/error.middleware";
import { evaluationsController } from "./evaluations.controller";

export const evaluationsRoutes = Router();

evaluationsRoutes.use(authMiddleware);

function ensureAthleteOrStaff(request: Request, _response: Response, next: NextFunction) {
  if (
    request.user?.roles.includes("Atleta") ||
    request.user?.roles.includes("Diretor") ||
    request.user?.roles.includes("Tecnico")
  ) {
    next();
    return;
  }

  next(new AppError("Permissão insuficiente", 403));
}

function ensureDirectorOrCoach(request: Request, _response: Response, next: NextFunction) {
  if (request.user?.roles.includes("Diretor") || request.user?.roles.includes("Tecnico")) {
    next();
    return;
  }

  next(new AppError("Acesso exclusivo para Diretor ou Técnico.", 403));
}

evaluationsRoutes.get("/me", ensureAthleteOrStaff, evaluationsController.getMe);
evaluationsRoutes.patch("/self", ensureAthleteOrStaff, evaluationsController.updateSelf);
evaluationsRoutes.get("/:athleteId", ensureDirectorOrCoach, evaluationsController.getByAthlete);
evaluationsRoutes.patch("/:athleteId", ensureDirectorOrCoach, evaluationsController.updateByAthlete);
