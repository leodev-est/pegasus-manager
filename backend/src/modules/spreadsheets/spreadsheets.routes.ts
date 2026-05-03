import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { spreadsheetsController } from "./spreadsheets.controller";

export const spreadsheetsRoutes = Router();

spreadsheetsRoutes.use(authMiddleware);

spreadsheetsRoutes.get("/", permissionMiddleware("operational:read"), spreadsheetsController.findAll);
spreadsheetsRoutes.post("/", permissionMiddleware("operational:create"), spreadsheetsController.create);
spreadsheetsRoutes.patch("/:id", permissionMiddleware("operational:update"), spreadsheetsController.update);
spreadsheetsRoutes.delete("/:id", permissionMiddleware("operational:delete"), spreadsheetsController.delete);
