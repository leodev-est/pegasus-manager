import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { uniformsController } from "./uniforms.controller";

export const uniformsRoutes = Router();

uniformsRoutes.use(authMiddleware);

uniformsRoutes.get("/items", permissionMiddleware("gestao"), uniformsController.getAllItems);
uniformsRoutes.get("/items/low-stock", permissionMiddleware("gestao"), uniformsController.getLowStock);
uniformsRoutes.get("/items/:id", permissionMiddleware("gestao"), uniformsController.getItemById);
uniformsRoutes.post("/items", permissionMiddleware("gestao"), uniformsController.createItem);
uniformsRoutes.patch("/items/:id", permissionMiddleware("gestao"), uniformsController.updateItem);
uniformsRoutes.delete("/items/:id", permissionMiddleware("gestao"), uniformsController.deleteItem);

uniformsRoutes.get("/deliveries", permissionMiddleware("gestao"), uniformsController.getDeliveries);
uniformsRoutes.post("/deliveries", permissionMiddleware("gestao"), uniformsController.createDelivery);
uniformsRoutes.delete("/deliveries/:id", permissionMiddleware("gestao"), uniformsController.deleteDelivery);
