import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { whatsAppController } from "./whatsapp.controller";

export const whatsAppRoutes = Router();

whatsAppRoutes.use(authMiddleware);

// Admin-only: manage connection
whatsAppRoutes.get("/status", permissionMiddleware("users:delete"), whatsAppController.getStatus);
whatsAppRoutes.post("/connect", permissionMiddleware("users:delete"), whatsAppController.connect);
whatsAppRoutes.post("/disconnect", permissionMiddleware("users:delete"), whatsAppController.disconnect);

// RH+: list groups and send broadcasts (Diretor also has rh permission via seed)
whatsAppRoutes.get("/groups", permissionMiddleware("rh"), whatsAppController.getGroups);
whatsAppRoutes.post("/broadcast", permissionMiddleware("rh"), whatsAppController.sendBroadcast);
