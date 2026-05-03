import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { usersController } from "./users.controller";

export const usersRoutes = Router();

usersRoutes.use(authMiddleware);

usersRoutes.get("/", permissionMiddleware("users:read"), usersController.findAll);
usersRoutes.post("/", permissionMiddleware("users:create"), usersController.create);
usersRoutes.patch("/:id/roles", permissionMiddleware("users:update"), usersController.updateRoles);
usersRoutes.patch("/:id", permissionMiddleware("users:update"), usersController.update);
usersRoutes.delete("/:id", permissionMiddleware("users:delete"), usersController.softDelete);
