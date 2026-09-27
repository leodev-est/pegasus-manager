import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { contentItemsController } from "./content-items.controller";

export const contentItemsRoutes = Router();

contentItemsRoutes.use(authMiddleware);

contentItemsRoutes.get("/week", permissionMiddleware(["marketing:read"]), contentItemsController.findForWeek);
contentItemsRoutes.post("/", permissionMiddleware("marketing:create"), contentItemsController.create);
contentItemsRoutes.patch("/:id", permissionMiddleware("marketing:update"), contentItemsController.update);
contentItemsRoutes.delete("/:id", permissionMiddleware("marketing:delete"), contentItemsController.delete);
