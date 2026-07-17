import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { reportsController } from "./reports.controller";

export const reportsRoutes = Router();

reportsRoutes.use(authMiddleware);
reportsRoutes.get("/", permissionMiddleware("finance:read"), reportsController.list);
reportsRoutes.post("/generate", permissionMiddleware("finance:read"), reportsController.generate);
reportsRoutes.get("/:id/download", permissionMiddleware("finance:read"), reportsController.download);
