import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { jerseyController } from "./jersey.controller";

export const jerseyRoutes = Router();

jerseyRoutes.use(authMiddleware);

jerseyRoutes.get("/", jerseyController.findAll);
jerseyRoutes.put("/:gender/:number", permissionMiddleware("management:update"), jerseyController.assign);
jerseyRoutes.delete("/:gender/:number", permissionMiddleware("management:delete"), jerseyController.unassign);
