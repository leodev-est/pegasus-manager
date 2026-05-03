import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { meController } from "./me.controller";

export const meRoutes = Router();

meRoutes.use(authMiddleware);

meRoutes.get("/profile", meController.getProfile);
meRoutes.patch("/profile", meController.updateProfile);
