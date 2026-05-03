import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { financeController } from "./finance.controller";

export const financeRoutes = Router();

financeRoutes.use(authMiddleware);

financeRoutes.get("/summary", permissionMiddleware("finance:read"), financeController.summary);
financeRoutes.get("/payments", permissionMiddleware("finance:read"), financeController.findPayments);
financeRoutes.post("/payments", permissionMiddleware("finance:create"), financeController.createPayment);
financeRoutes.patch(
  "/payments/:id",
  permissionMiddleware("finance:update"),
  financeController.updatePayment,
);
financeRoutes.delete(
  "/payments/:id",
  permissionMiddleware("finance:delete"),
  financeController.deletePayment,
);
financeRoutes.get("/movements", permissionMiddleware("finance:read"), financeController.findMovements);
financeRoutes.post(
  "/movements",
  permissionMiddleware("finance:create"),
  financeController.createMovement,
);
financeRoutes.patch(
  "/movements/:id",
  permissionMiddleware("finance:update"),
  financeController.updateMovement,
);
financeRoutes.delete(
  "/movements/:id",
  permissionMiddleware("finance:delete"),
  financeController.deleteMovement,
);
