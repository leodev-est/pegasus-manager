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

  // Limpeza diária: apaga tasks done/published há mais de TASK_RETENTION_DAYS, pra não
  // acumular lixo no banco. O botão "Limpar antigos" no kanban faz o mesmo na hora.
  cron.schedule("0 3 * * *", async () => {
    try {
      const deleted = await tasksService.deleteFinishedOlderThan();
      if (deleted > 0) {
        console.log(`[Tasks Scheduler] Limpeza automática: ${deleted} tarefa(s) antiga(s) removida(s).`);
      }
    } catch (err) {
      console.error("[Tasks Scheduler] Erro na limpeza automática:", err);
    }
  });
  console.log("[Tasks Scheduler] Cleanup started (daily at 03:00)");
}
