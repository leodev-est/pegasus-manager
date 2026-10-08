import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { gameConvocationsController } from "./game-convocations.controller";

export const gameConvocationsRouter = Router();

const canEdit = permissionMiddleware(["management:update", "trainings:update"]);

gameConvocationsRouter.use(authMiddleware);

// Leitura liberada pra qualquer usuário logado (inclusive Atleta) — ver quem foi
// convocado não é dado sensível.
// Rota /mine deve vir antes de /:gameId para não ser capturada como parâmetro
gameConvocationsRouter.get("/convocations/mine", gameConvocationsController.getMyConvocations);

gameConvocationsRouter.get("/:gameId/convocations", gameConvocationsController.getByGame);
gameConvocationsRouter.put("/:gameId/convocations", canEdit, gameConvocationsController.bulkSetAndNotify);
gameConvocationsRouter.put("/:gameId/convocations/:athleteId", canEdit, gameConvocationsController.upsert);
gameConvocationsRouter.delete("/:gameId/convocations/:athleteId", canEdit, gameConvocationsController.remove);
