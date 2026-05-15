import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { pushController } from "./push.controller";

export const pushRoutes = Router();

pushRoutes.get("/vapid-public-key", pushController.getPublicKey);

pushRoutes.use(authMiddleware);
pushRoutes.post("/subscribe", pushController.subscribe);
pushRoutes.post("/unsubscribe", pushController.unsubscribe);
