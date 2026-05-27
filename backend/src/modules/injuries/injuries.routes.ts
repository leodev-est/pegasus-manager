import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { injuriesController } from "./injuries.controller";

export const injuriesRoutes = Router();

injuriesRoutes.use(authMiddleware);

injuriesRoutes.get("/me", injuriesController.listMine);
injuriesRoutes.get("/", permissionMiddleware(["athletes:read", "trainings:read"]), injuriesController.list);
injuriesRoutes.post("/", permissionMiddleware(["athletes:update"]), injuriesController.create);
injuriesRoutes.patch("/:id", permissionMiddleware(["athletes:update"]), injuriesController.update);
injuriesRoutes.delete("/:id", permissionMiddleware(["athletes:delete"]), injuriesController.remove);
