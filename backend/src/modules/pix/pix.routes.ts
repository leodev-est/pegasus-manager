import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { pixController } from "./pix.controller";

export const pixRoutes = Router();

pixRoutes.post("/payment/:paymentId/generate", authMiddleware, permissionMiddleware("financeiro:update"), pixController.generatePix);
pixRoutes.post("/webhook", pixController.webhook);
