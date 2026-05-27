import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { trainingPlansController } from "./training-plans.controller";

export const trainingPlansRoutes = Router();

trainingPlansRoutes.use(authMiddleware);

trainingPlansRoutes.get("/me", trainingPlansController.getMine);
trainingPlansRoutes.get("/", permissionMiddleware(["trainings:read"]), trainingPlansController.list);
trainingPlansRoutes.post("/", permissionMiddleware(["trainings:create"]), trainingPlansController.create);
trainingPlansRoutes.patch("/:id", permissionMiddleware(["trainings:update"]), trainingPlansController.update);
trainingPlansRoutes.delete("/:id", permissionMiddleware(["trainings:delete"]), trainingPlansController.remove);
