import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { eventsController } from "./events.controller";

export const eventsRoutes = Router();

eventsRoutes.use(authMiddleware);

eventsRoutes.get("/", permissionMiddleware(["marketing:read"]), eventsController.findAll);
eventsRoutes.post("/", permissionMiddleware("marketing:create"), eventsController.create);
eventsRoutes.patch("/:id", permissionMiddleware("marketing:update"), eventsController.update);
eventsRoutes.delete("/:id", permissionMiddleware("marketing:delete"), eventsController.delete);
