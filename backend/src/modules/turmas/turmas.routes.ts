import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { turmasController } from "./turmas.controller";

export const turmasRoutes = Router();

// Sem autenticação — o formulário público de inscrição precisa listar as turmas ativas.
turmasRoutes.get("/public", turmasController.findPublicActive);

turmasRoutes.use(authMiddleware);

turmasRoutes.get("/", permissionMiddleware("trainings:read"), turmasController.findAll);
turmasRoutes.post("/", permissionMiddleware("trainings:update"), turmasController.create);
turmasRoutes.patch("/:id", permissionMiddleware("trainings:update"), turmasController.update);
turmasRoutes.delete("/:id", permissionMiddleware("trainings:update"), turmasController.delete);
