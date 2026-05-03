import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { AppError } from "../../middlewares/error.middleware";
import { notificationsController } from "./notifications.controller";

export const notificationsRoutes = Router();

notificationsRoutes.use(authMiddleware);

function ensureDirectorOrCoach(request: Request, _response: Response, next: NextFunction) {
  if (request.user?.roles.includes("Diretor") || request.user?.roles.includes("Tecnico")) {
    next();
    return;
  }

  next(new AppError("Acesso exclusivo para Diretor ou Técnico.", 403));
}

notificationsRoutes.get("/", notificationsController.findMine);
notificationsRoutes.patch("/read-all", notificationsController.markAllAsRead);
notificationsRoutes.patch("/:id/read", notificationsController.markAsRead);
notificationsRoutes.post("/", ensureDirectorOrCoach, notificationsController.create);
