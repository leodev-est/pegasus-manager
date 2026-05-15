import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { tasksController } from "./tasks.controller";

export const tasksRoutes = Router();

tasksRoutes.use(authMiddleware);

tasksRoutes.get("/publish-scheduled", tasksController.publishScheduled);
tasksRoutes.get("/", permissionMiddleware("management:read"), tasksController.findAll);
tasksRoutes.get("/:id", permissionMiddleware("management:read"), tasksController.findById);
tasksRoutes.post("/", permissionMiddleware("management:create"), tasksController.create);
tasksRoutes.patch("/:id", permissionMiddleware("management:update"), tasksController.update);
tasksRoutes.patch("/:id/status", permissionMiddleware("management:update"), tasksController.updateStatus);
tasksRoutes.patch("/:id/approve", permissionMiddleware("management:update"), tasksController.approve);
tasksRoutes.patch("/:id/reject", permissionMiddleware("management:update"), tasksController.reject);
tasksRoutes.delete("/:id", permissionMiddleware("management:delete"), tasksController.delete);
