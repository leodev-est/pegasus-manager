import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { reportsController } from "./reports.controller";

export const reportsRoutes = Router();

reportsRoutes.use(authMiddleware);
reportsRoutes.get("/", permissionMiddleware("financeiro:read"), reportsController.list);
reportsRoutes.post("/generate", permissionMiddleware("financeiro:read"), reportsController.generate);
reportsRoutes.get("/:id/download", permissionMiddleware("financeiro:read"), reportsController.download);
