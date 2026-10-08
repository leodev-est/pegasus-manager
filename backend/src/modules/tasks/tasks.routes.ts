import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { tasksController } from "./tasks.controller";

export const tasksRoutes = Router();

tasksRoutes.use(authMiddleware);

// A permissão de verdade é por área (management OU marketing, dependendo da task) e já é
// checada dentro do controller via ensureAreaPermission/checagem de role — um gate fixo
// de permissionMiddleware aqui bloquearia Marketing/ChefeMarketing nas próprias tasks
// (eles têm marketing:*, não management:*) e o próprio ChefeMarketing em approve/reject.
tasksRoutes.get("/publish-scheduled", permissionMiddleware(["management:read", "marketing:read"]), tasksController.publishScheduled);
tasksRoutes.get("/", tasksController.findAll);
tasksRoutes.get("/:id", tasksController.findById);
tasksRoutes.post("/", tasksController.create);
tasksRoutes.patch("/:id", tasksController.update);
tasksRoutes.patch("/:id/status", tasksController.updateStatus);
tasksRoutes.patch("/:id/approve", tasksController.approve);
tasksRoutes.patch("/:id/reject", tasksController.reject);
tasksRoutes.delete("/:id", tasksController.delete);
