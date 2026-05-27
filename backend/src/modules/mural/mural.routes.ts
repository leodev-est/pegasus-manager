import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { muralController } from "./mural.controller";

export const muralRoutes = Router();

muralRoutes.use(authMiddleware);

muralRoutes.get("/", muralController.list);
muralRoutes.post("/", permissionMiddleware(["management:create"]), muralController.create);
muralRoutes.delete("/:id", permissionMiddleware(["management:delete"]), muralController.remove);
