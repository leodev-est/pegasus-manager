import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { auditController } from "./audit.controller";

export const auditRoutes = Router();

auditRoutes.use(authMiddleware);
auditRoutes.get("/", permissionMiddleware("admin"), auditController.list);
