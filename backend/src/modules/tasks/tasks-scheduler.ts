import cron from "node-cron";
import { tasksService } from "./tasks.service";

export function startTasksScheduler(): void {
  cron.schedule("* * * * *", async () => {
    try {
      await tasksService.publishScheduled();
    } catch (err) {
      console.error("[Tasks Scheduler] Erro ao publicar tarefas agendadas:", err);
    }
  });
  console.log("[Tasks Scheduler] Started (every minute)");
}
