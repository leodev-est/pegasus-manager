import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { rolesController } from "./roles.controller";

export const rolesRoutes = Router();

rolesRoutes.use(authMiddleware);

rolesRoutes.get("/", permissionMiddleware("roles:read"), rolesController.findAll);
rolesRoutes.post("/", permissionMiddleware("roles:create"), rolesController.create);
rolesRoutes.patch("/:id", permissionMiddleware("roles:update"), rolesController.update);
