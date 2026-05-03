import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { AppError } from "../../middlewares/error.middleware";
import { attendanceController } from "./attendance.controller";

export const attendanceRoutes = Router();

attendanceRoutes.use(authMiddleware);

function canReadTrainingsOrIsAthlete(user: Request["user"]) {
  return Boolean(
    user &&
      (user.roles.includes("Diretor") ||
        user.roles.includes("Atleta") ||
        user.permissions.includes("trainings:read")),
  );
}

function ensureTrainingsReadOrAthlete(
  request: Request,
  _response: Response,
  next: NextFunction,
) {
  if (canReadTrainingsOrIsAthlete(request.user)) {
    next();
    return;
  }

  next(new AppError("Permissão insuficiente", 403));
}

function ensureAthlete(request: Request, _response: Response, next: NextFunction) {
  if (request.user?.roles.includes("Atleta")) {
    next();
    return;
  }

  next(new AppError("Acesso exclusivo para atletas.", 403));
}

function ensureDirectorOrCoach(
  request: Request,
  _response: Response,
  next: NextFunction,
) {
  if (request.user?.roles.includes("Diretor") || request.user?.roles.includes("Tecnico")) {
    next();
    return;
  }

  next(new AppError("Acesso exclusivo para Diretor ou Técnico.", 403));
}

attendanceRoutes.get("/check-in/today", ensureTrainingsReadOrAthlete, attendanceController.todayCheckIn);
attendanceRoutes.post("/check-in", ensureAthlete, attendanceController.checkIn);
attendanceRoutes.get("/my-frequency", ensureAthlete, attendanceController.myFrequency);
attendanceRoutes.get("/frequency", ensureDirectorOrCoach, attendanceController.frequency);
attendanceRoutes.patch("/:id", ensureDirectorOrCoach, attendanceController.update);
