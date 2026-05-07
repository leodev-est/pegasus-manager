import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { athleteApplicationsController } from "./athlete-applications.controller";

export const athleteApplicationsRoutes = Router();

// Public route — no auth required (landing page registration form)
athleteApplicationsRoutes.post("/public", athleteApplicationsController.publicCreate);

// All routes below require authentication
athleteApplicationsRoutes.use(authMiddleware);

athleteApplicationsRoutes.get("/", permissionMiddleware("athletes:read"), athleteApplicationsController.findAll);
athleteApplicationsRoutes.get("/:id", permissionMiddleware("athletes:read"), athleteApplicationsController.findById);
athleteApplicationsRoutes.post("/", permissionMiddleware("athletes:create"), athleteApplicationsController.create);
athleteApplicationsRoutes.post("/import/google-sheets", permissionMiddleware("athletes:create"), athleteApplicationsController.importFromGoogleSheets);
athleteApplicationsRoutes.patch("/:id", permissionMiddleware("athletes:update"), athleteApplicationsController.update);
athleteApplicationsRoutes.post("/:id/approve", permissionMiddleware("athletes:create"), athleteApplicationsController.approve);
athleteApplicationsRoutes.delete("/:id", permissionMiddleware("athletes:delete"), athleteApplicationsController.delete);
