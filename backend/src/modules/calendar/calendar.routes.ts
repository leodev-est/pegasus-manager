import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { calendarController } from "./calendar.controller";
import { emailService } from "../email/email.service";

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

calendarRoutes.post(
  "/test-email",
  permissionMiddleware(["management:update", "management:create"]),
  async (_req, res) => {
    const result = await emailService.testConnection();
    res.json(result);
  },
);
