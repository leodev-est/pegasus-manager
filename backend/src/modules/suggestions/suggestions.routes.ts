import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { suggestionsController } from "./suggestions.controller";

export const suggestionsRoutes = Router();

suggestionsRoutes.use(authMiddleware);

// Any authenticated user (athlete or staff) can submit
suggestionsRoutes.post("/", suggestionsController.create);

// RH reads/responds
suggestionsRoutes.get("/", permissionMiddleware(["athletes:read", "management:read"]), suggestionsController.findAll);
suggestionsRoutes.patch("/:id", permissionMiddleware(["athletes:update", "management:update"]), suggestionsController.update);
