import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { authController } from "./auth.controller";

export const authRoutes = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Muitas tentativas de login. Tente novamente em 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

authRoutes.post("/login", loginLimiter, authController.login);
authRoutes.get("/me", authMiddleware, authController.me);
authRoutes.post("/change-password", authMiddleware, authController.changePassword);
authRoutes.post("/change-first-password", authMiddleware, authController.changeFirstPassword);
