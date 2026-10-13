import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { referencesController } from "./references.controller";

export const referencesRoutes = Router();

referencesRoutes.use(authMiddleware);

referencesRoutes.get("/", permissionMiddleware("marketing:read"), referencesController.findAll);
referencesRoutes.post("/", permissionMiddleware("marketing:create"), referencesController.create);
referencesRoutes.patch("/:id", permissionMiddleware("marketing:update"), referencesController.update);
referencesRoutes.post("/:id/task", permissionMiddleware("marketing:create"), referencesController.toTask);
referencesRoutes.delete("/:id", permissionMiddleware("marketing:delete"), referencesController.delete);
