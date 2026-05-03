import { Router } from "express";
import { athleteApplicationsRoutes } from "./modules/athlete-applications/athlete-applications.routes";
import { athletesRoutes } from "./modules/athletes/athletes.routes";
import { attendanceRoutes } from "./modules/attendance/attendance.routes";
import { authRoutes } from "./modules/auth/auth.routes";
import { financeRoutes } from "./modules/finance/finance.routes";
import { formationsRoutes } from "./modules/formations/formations.routes";
import { evaluationsRoutes } from "./modules/evaluations/evaluations.routes";
import { meRoutes } from "./modules/me/me.routes";
import { notificationsRoutes } from "./modules/notifications/notifications.routes";
import { permissionsRoutes } from "./modules/permissions/permissions.routes";
import { rolesRoutes } from "./modules/roles/roles.routes";
import { schoolsRoutes } from "./modules/schools/schools.routes";
import { spreadsheetsRoutes } from "./modules/spreadsheets/spreadsheets.routes";
import { tasksRoutes } from "./modules/tasks/tasks.routes";
import { trainingsRoutes } from "./modules/trainings/trainings.routes";
import { usersRoutes } from "./modules/users/users.routes";

export const routes = Router();

routes.get("/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "Pegasus Manager API",
  });
});

routes.use("/auth", authRoutes);
routes.use("/athlete-applications", athleteApplicationsRoutes);
routes.use("/athletes", athletesRoutes);
routes.use("/attendance", attendanceRoutes);
routes.use("/finance", financeRoutes);
routes.use("/formations", formationsRoutes);
routes.use("/evaluations", evaluationsRoutes);
routes.use("/me", meRoutes);
routes.use("/notifications", notificationsRoutes);
routes.use("/schools", schoolsRoutes);
routes.use("/spreadsheets", spreadsheetsRoutes);
routes.use("/tasks", tasksRoutes);
routes.use("/trainings", trainingsRoutes);
routes.use("/users", usersRoutes);
routes.use("/roles", rolesRoutes);
routes.use("/permissions", permissionsRoutes);
