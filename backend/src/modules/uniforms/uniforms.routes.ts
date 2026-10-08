import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { uniformsController } from "./uniforms.controller";

export const uniformsRoutes = Router();

uniformsRoutes.use(authMiddleware);

uniformsRoutes.get("/items", permissionMiddleware("management:read"), uniformsController.getAllItems);
uniformsRoutes.get("/items/low-stock", permissionMiddleware("management:read"), uniformsController.getLowStock);
uniformsRoutes.get("/items/:id", permissionMiddleware("management:read"), uniformsController.getItemById);
uniformsRoutes.post("/items", permissionMiddleware("management:create"), uniformsController.createItem);
uniformsRoutes.patch("/items/:id", permissionMiddleware("management:update"), uniformsController.updateItem);
uniformsRoutes.delete("/items/:id", permissionMiddleware("management:delete"), uniformsController.deleteItem);

uniformsRoutes.get("/deliveries", permissionMiddleware("management:read"), uniformsController.getDeliveries);
uniformsRoutes.post("/deliveries", permissionMiddleware("management:create"), uniformsController.createDelivery);
uniformsRoutes.delete("/deliveries/:id", permissionMiddleware("management:delete"), uniformsController.deleteDelivery);
