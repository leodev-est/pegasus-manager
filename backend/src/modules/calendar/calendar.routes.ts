import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { calendarController } from "./calendar.controller";

export const calendarRoutes = Router();

calendarRoutes.use(authMiddleware);

calendarRoutes.get("/blocked-dates", calendarController.getBlockedDates);
calendarRoutes.put(
  "/blocked-dates",
  permissionMiddleware(["management:create", "management:update"]),
  calendarController.setBlockedDates,
);
calendarRoutes.post(
  "/blocked-dates/toggle",
  permissionMiddleware(["management:create", "management:update"]),
  calendarController.toggleBlockedDate,
);

calendarRoutes.get("/training-config", calendarController.getTrainingConfig);
calendarRoutes.put(
  "/training-config",
  permissionMiddleware(["management:update", "management:create"]),
  calendarController.updateTrainingConfig,
);
