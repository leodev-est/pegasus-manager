import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { whatsAppController } from "./whatsapp.controller";

export const whatsAppRoutes = Router();

whatsAppRoutes.use(authMiddleware);
whatsAppRoutes.use(permissionMiddleware("users:delete")); // Diretor only

whatsAppRoutes.get("/status", whatsAppController.getStatus);
whatsAppRoutes.post("/connect", whatsAppController.connect);
whatsAppRoutes.post("/disconnect", whatsAppController.disconnect);
