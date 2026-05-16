import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { gameConvocationsController } from "./game-convocations.controller";

export const gameConvocationsRouter = Router();

const canView = permissionMiddleware("dashboard");
const canEdit = permissionMiddleware(["gestao", "treinos"]);

gameConvocationsRouter.use(authMiddleware);

gameConvocationsRouter.get("/:gameId/convocations", canView, gameConvocationsController.getByGame);
gameConvocationsRouter.put("/:gameId/convocations", canEdit, gameConvocationsController.bulkSet);
gameConvocationsRouter.put("/:gameId/convocations/:athleteId", canEdit, gameConvocationsController.upsert);
gameConvocationsRouter.delete("/:gameId/convocations/:athleteId", canEdit, gameConvocationsController.remove);
