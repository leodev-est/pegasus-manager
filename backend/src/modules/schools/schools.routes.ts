import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { schoolsController } from "./schools.controller";

export const schoolsRoutes = Router();

schoolsRoutes.use(authMiddleware);

schoolsRoutes.get(
  "/contacts/google-sheets",
  permissionMiddleware("operational:read"),
  schoolsController.findContacts,
);
schoolsRoutes.get("/", permissionMiddleware("operational:read"), schoolsController.findAll);
schoolsRoutes.get("/:id", permissionMiddleware("operational:read"), schoolsController.findById);
schoolsRoutes.post("/", permissionMiddleware("operational:create"), schoolsController.create);
schoolsRoutes.patch("/:id", permissionMiddleware("operational:update"), schoolsController.update);
schoolsRoutes.delete("/:id", permissionMiddleware("operational:delete"), schoolsController.delete);
