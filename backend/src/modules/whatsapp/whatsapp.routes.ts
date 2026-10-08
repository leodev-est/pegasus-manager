import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { whatsAppController } from "./whatsapp.controller";

export const whatsAppRoutes = Router();

// Webhook called by Evolution API — no auth (Evolution API is the caller)
whatsAppRoutes.post("/webhook", whatsAppController.webhook);

// All other routes require authentication
whatsAppRoutes.use(authMiddleware);

// Admin-only: manage connection
whatsAppRoutes.get("/status", permissionMiddleware("users:delete"), whatsAppController.getStatus);
whatsAppRoutes.post("/connect", permissionMiddleware("users:delete"), whatsAppController.connect);
whatsAppRoutes.post("/disconnect", permissionMiddleware("users:delete"), whatsAppController.disconnect);
whatsAppRoutes.post("/pairing-code", permissionMiddleware("users:delete"), whatsAppController.pairingCode);

// RH+: list groups and send broadcasts ("rh" não é uma chave real no banco — RH tem
// "athletes:read" no seed, é essa a chave que de fato dá acesso à área de RH)
whatsAppRoutes.get("/groups", permissionMiddleware("athletes:read"), whatsAppController.getGroups);
whatsAppRoutes.post("/broadcast", permissionMiddleware("athletes:read"), whatsAppController.sendBroadcast);
