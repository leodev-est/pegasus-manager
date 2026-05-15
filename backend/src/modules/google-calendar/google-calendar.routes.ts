import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { googleCalendarController } from "./google-calendar.controller";

export const googleCalendarRoutes = Router();

// Per-user calendar (all authenticated users)
googleCalendarRoutes.get("/auth-url", authMiddleware, googleCalendarController.getAuthUrl);
googleCalendarRoutes.get("/callback", googleCalendarController.callback);
googleCalendarRoutes.delete("/disconnect", authMiddleware, googleCalendarController.disconnect);
googleCalendarRoutes.get("/status", authMiddleware, googleCalendarController.getUserStatus);

// Team calendar (directors/gestão only)
googleCalendarRoutes.get("/team/auth-url", authMiddleware, permissionMiddleware("management:update"), googleCalendarController.getTeamAuthUrl);
googleCalendarRoutes.get("/team/callback", googleCalendarController.teamCallback);
googleCalendarRoutes.delete("/team/disconnect", authMiddleware, permissionMiddleware("management:update"), googleCalendarController.disconnectTeam);
googleCalendarRoutes.get("/team/status", authMiddleware, googleCalendarController.getTeamStatus);
