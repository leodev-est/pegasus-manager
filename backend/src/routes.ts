import { Router } from "express";
import { announcementsRoutes } from "./modules/announcements/announcements.routes";
import { auditRoutes } from "./modules/audit/audit.routes";
import { athleteApplicationsRoutes } from "./modules/athlete-applications/athlete-applications.routes";
import { athletesRoutes } from "./modules/athletes/athletes.routes";
import { attendanceRoutes } from "./modules/attendance/attendance.routes";
import { authRoutes } from "./modules/auth/auth.routes";
import { calendarRoutes } from "./modules/calendar/calendar.routes";
import { financeRoutes } from "./modules/finance/finance.routes";
import { formationsRoutes } from "./modules/formations/formations.routes";
import { evaluationsRoutes } from "./modules/evaluations/evaluations.routes";
import { gamesRoutes } from "./modules/games/games.routes";
import { jerseyRoutes } from "./modules/jersey/jersey.routes";
import { googleCalendarRoutes } from "./modules/google-calendar/google-calendar.routes";
import { meRoutes } from "./modules/me/me.routes";
import { notificationsRoutes } from "./modules/notifications/notifications.routes";
import { pushRoutes } from "./modules/push/push.routes";
import { permissionsRoutes } from "./modules/permissions/permissions.routes";
import { pixRoutes } from "./modules/pix/pix.routes";
import { reportsRoutes } from "./modules/reports/reports.routes";
import { rolesRoutes } from "./modules/roles/roles.routes";
import { schoolsRoutes } from "./modules/schools/schools.routes";
import { spreadsheetsRoutes } from "./modules/spreadsheets/spreadsheets.routes";
import { tasksRoutes } from "./modules/tasks/tasks.routes";
import { trainingsRoutes } from "./modules/trainings/trainings.routes";
import { uniformsRoutes } from "./modules/uniforms/uniforms.routes";
import { usersRoutes } from "./modules/users/users.routes";
import { whatsAppRoutes } from "./modules/whatsapp/whatsapp.routes";
import { suggestionsRoutes } from "./modules/suggestions/suggestions.routes";
import { trainingFeedbackRoutes } from "./modules/training-feedback/training-feedback.routes";
import { gameConvocationsRouter } from "./modules/game-convocations/game-convocations.routes";
import { muralRoutes } from "./modules/mural/mural.routes";
import { injuriesRoutes } from "./modules/injuries/injuries.routes";
import { trainingPlansRoutes } from "./modules/training-plans/training-plans.routes";
import { marketingCalendarRoutes } from "./modules/marketing-calendar/marketing-calendar.routes";

export const routes = Router();

routes.get("/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "Pegasus Manager API",
  });
});

routes.use("/announcements", announcementsRoutes);
routes.use("/audit", auditRoutes);
routes.use("/auth", authRoutes);
routes.use("/calendar", calendarRoutes);
routes.use("/athlete-applications", athleteApplicationsRoutes);
routes.use("/athletes", athletesRoutes);
routes.use("/attendance", attendanceRoutes);
routes.use("/finance", financeRoutes);
routes.use("/formations", formationsRoutes);
routes.use("/evaluations", evaluationsRoutes);
routes.use("/games", gamesRoutes);
routes.use("/jersey", jerseyRoutes);
routes.use("/google-calendar", googleCalendarRoutes);
routes.use("/me", meRoutes);
routes.use("/notifications", notificationsRoutes);
routes.use("/pix", pixRoutes);
routes.use("/push", pushRoutes);
routes.use("/reports", reportsRoutes);
routes.use("/schools", schoolsRoutes);
routes.use("/spreadsheets", spreadsheetsRoutes);
routes.use("/tasks", tasksRoutes);
routes.use("/trainings", trainingsRoutes);
routes.use("/uniforms", uniformsRoutes);
routes.use("/users", usersRoutes);
routes.use("/roles", rolesRoutes);
routes.use("/permissions", permissionsRoutes);
routes.use("/whatsapp", whatsAppRoutes);
routes.use("/suggestions", suggestionsRoutes);
routes.use("/training-feedback", trainingFeedbackRoutes);
routes.use("/games", gameConvocationsRouter);
routes.use("/mural", muralRoutes);
routes.use("/injuries", injuriesRoutes);
routes.use("/training-plans", trainingPlansRoutes);
routes.use("/marketing-calendar", marketingCalendarRoutes);
