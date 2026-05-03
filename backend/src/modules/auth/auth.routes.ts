import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { authController } from "./auth.controller";

export const authRoutes = Router();

authRoutes.post("/login", authController.login);
authRoutes.get("/me", authMiddleware, authController.me);
authRoutes.post("/change-password", authMiddleware, authController.changePassword);
authRoutes.post("/change-first-password", authMiddleware, authController.changeFirstPassword);
