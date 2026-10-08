import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { gamesController } from "./games.controller";

export const gamesRoutes = Router();

gamesRoutes.use(authMiddleware);

// Leitura liberada pra qualquer usuário logado (inclusive Atleta) — resultados de jogos
// não são dado sensível, e é assim que o frontend já trata (permissão "dashboard").
gamesRoutes.get("/", gamesController.getAll);
gamesRoutes.get("/stats", gamesController.getStats);
gamesRoutes.get("/:id", gamesController.getById);
gamesRoutes.post("/", permissionMiddleware("management:update"), gamesController.create);
gamesRoutes.patch("/:id", permissionMiddleware("management:update"), gamesController.update);
gamesRoutes.delete("/:id", permissionMiddleware("management:update"), gamesController.delete);
gamesRoutes.put("/:id/sets", permissionMiddleware("management:update"), gamesController.upsertSet);
gamesRoutes.delete("/:id/sets/:setNumber", permissionMiddleware("management:update"), gamesController.deleteSet);
