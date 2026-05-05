import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { tasksController } from "./tasks.controller";

export const tasksRoutes = Router();

tasksRoutes.use(authMiddleware);

tasksRoutes.get("/publish-scheduled", tasksController.publishScheduled);
tasksRoutes.get("/", tasksController.findAll);
tasksRoutes.get("/:id", tasksController.findById);
tasksRoutes.post("/", tasksController.create);
tasksRoutes.patch("/:id", tasksController.update);
tasksRoutes.patch("/:id/status", tasksController.updateStatus);
tasksRoutes.patch("/:id/approve", tasksController.approve);
tasksRoutes.patch("/:id/reject", tasksController.reject);
tasksRoutes.delete("/:id", tasksController.delete);
