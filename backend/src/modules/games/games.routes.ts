import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { gamesController } from "./games.controller";

export const gamesRoutes = Router();

gamesRoutes.use(authMiddleware);

gamesRoutes.get("/", permissionMiddleware("dashboard"), gamesController.getAll);
gamesRoutes.get("/stats", permissionMiddleware("dashboard"), gamesController.getStats);
gamesRoutes.get("/:id", permissionMiddleware("dashboard"), gamesController.getById);
gamesRoutes.post("/", permissionMiddleware("gestao"), gamesController.create);
gamesRoutes.patch("/:id", permissionMiddleware("gestao"), gamesController.update);
gamesRoutes.delete("/:id", permissionMiddleware("gestao"), gamesController.delete);
gamesRoutes.put("/:id/sets", permissionMiddleware("gestao"), gamesController.upsertSet);
gamesRoutes.delete("/:id/sets/:setNumber", permissionMiddleware("gestao"), gamesController.deleteSet);
