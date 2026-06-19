import "dotenv/config";
import { app } from "./app";
import { prisma } from "./config/prisma";
import { startAnnouncementsScheduler } from "./modules/announcements/announcements-scheduler";
import { startFinanceScheduler } from "./modules/finance/finance-scheduler";
import { startPaymentNotificationScheduler } from "./modules/finance/payment-notification-scheduler";
import { startReportScheduler } from "./modules/reports/report-scheduler";
import { startTasksScheduler } from "./modules/tasks/tasks-scheduler";
import { whatsAppService } from "./modules/whatsapp/whatsapp.service";
import { startWhatsAppScheduler } from "./modules/whatsapp/whatsapp-scheduler";

const PORT = process.env.PORT || 3000;

function startKeepAlive(baseUrl: string) {
  // Ping /health every 14 min to prevent Render free-tier spin-down
  // Ping database every 4 min to prevent Neon free-tier auto-pause
  setInterval(() => {
    fetch(`${baseUrl}/health`).catch(() => {});
  }, 14 * 60 * 1000);

  setInterval(async () => {
    try { await prisma.$queryRaw`SELECT 1`; } catch {}
  }, 4 * 60 * 1000);
}

app.listen(PORT, async () => {
  console.log(`Pegasus Manager API running on port ${PORT}`);
  await whatsAppService.init();
  startWhatsAppScheduler();
  startTasksScheduler();
  startFinanceScheduler();
  startPaymentNotificationScheduler();
  startAnnouncementsScheduler();
  startReportScheduler();

  const selfUrl = process.env.RENDER_EXTERNAL_URL;
  if (selfUrl) {
    startKeepAlive(selfUrl);
  }
});
