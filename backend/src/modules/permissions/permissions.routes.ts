import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { permissionsController } from "./permissions.controller";

export const permissionsRoutes = Router();

permissionsRoutes.use(authMiddleware);

permissionsRoutes.get("/", permissionMiddleware("permissions:read"), permissionsController.findAll);
