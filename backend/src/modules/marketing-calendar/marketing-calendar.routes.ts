import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { permissionMiddleware } from "../../middlewares/permission.middleware";
import { marketingCalendarController } from "./marketing-calendar.controller";

export const marketingCalendarRoutes = Router();

marketingCalendarRoutes.use(authMiddleware);

marketingCalendarRoutes.get("/events", permissionMiddleware("marketing:read"), marketingCalendarController.getEvents);
// Sem restrição de marketing:read — qualquer usuário autenticado (inclusive atletas)
// pode ver os "eventos de time" no próprio calendário de treinos.
marketingCalendarRoutes.get("/events/team", marketingCalendarController.getTeamEvents);
marketingCalendarRoutes.post("/events", permissionMiddleware("marketing:create"), marketingCalendarController.createEvent);
marketingCalendarRoutes.patch("/events/:id", permissionMiddleware("marketing:update"), marketingCalendarController.updateEvent);
marketingCalendarRoutes.delete("/events/:id", permissionMiddleware("marketing:delete"), marketingCalendarController.deleteEvent);
