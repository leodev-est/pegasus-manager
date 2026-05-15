import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { athletesController } from "./athletes.controller";

export const athletesRoutes = Router();

athletesRoutes.use(authMiddleware);

athletesRoutes.get("/", permissionMiddleware(["athletes:read", "management:read", "trainings:read"]), athletesController.findAll);
athletesRoutes.get("/:id", permissionMiddleware(["athletes:read", "management:read"]), athletesController.findById);
athletesRoutes.post("/", permissionMiddleware("athletes:create"), athletesController.create);
athletesRoutes.post(
  "/import/google-sheets",
  permissionMiddleware("athletes:create"),
  athletesController.importFromGoogleSheets,
);
athletesRoutes.patch("/:id", permissionMiddleware("athletes:update"), athletesController.update);
athletesRoutes.patch("/:id/payment-status", permissionMiddleware(["athletes:update", "finance:update"]), athletesController.updatePaymentStatus);
athletesRoutes.get("/:id/payment-status-history", permissionMiddleware(["athletes:read", "finance:read"]), athletesController.getPaymentStatusHistory);
athletesRoutes.delete("/:id", permissionMiddleware("athletes:delete"), athletesController.softDelete);
