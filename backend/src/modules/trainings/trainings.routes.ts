import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { trainingsController } from "./trainings.controller";

export const trainingsRoutes = Router();

trainingsRoutes.use(authMiddleware);

trainingsRoutes.get("/", permissionMiddleware("trainings:read"), trainingsController.findAll);
trainingsRoutes.get("/:id", permissionMiddleware("trainings:read"), trainingsController.findById);
trainingsRoutes.post("/", permissionMiddleware("trainings:create"), trainingsController.create);
trainingsRoutes.patch("/:id", permissionMiddleware("trainings:update"), trainingsController.update);
trainingsRoutes.delete("/:id", permissionMiddleware("trainings:delete"), trainingsController.delete);
