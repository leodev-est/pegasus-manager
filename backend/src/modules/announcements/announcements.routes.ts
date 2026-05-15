import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { announcementsController } from "./announcements.controller";

export const announcementsRoutes = Router();

announcementsRoutes.use(authMiddleware);
announcementsRoutes.use(permissionMiddleware("management:read"));

announcementsRoutes.get("/templates", announcementsController.listTemplates);
announcementsRoutes.post("/templates", announcementsController.createTemplate);
announcementsRoutes.patch("/templates/:id", announcementsController.updateTemplate);
announcementsRoutes.delete("/templates/:id", announcementsController.deleteTemplate);

announcementsRoutes.get("/scheduled", announcementsController.listScheduled);
announcementsRoutes.post("/scheduled", announcementsController.createScheduled);
announcementsRoutes.patch("/scheduled/:id/cancel", announcementsController.cancelScheduled);
