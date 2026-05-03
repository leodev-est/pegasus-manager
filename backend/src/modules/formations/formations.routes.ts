import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { formationsController } from "./formations.controller";

export const formationsRoutes = Router();

formationsRoutes.use(authMiddleware);

formationsRoutes.get("/", permissionMiddleware("trainings:read"), formationsController.findAll);
formationsRoutes.post("/", permissionMiddleware("trainings:create"), formationsController.create);
formationsRoutes.patch("/:id", permissionMiddleware("trainings:update"), formationsController.update);
formationsRoutes.delete("/:id", permissionMiddleware("trainings:delete"), formationsController.delete);
