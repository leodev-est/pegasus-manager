import "dotenv/config";
import { app } from "./app";
import { startAnnouncementsScheduler } from "./modules/announcements/announcements-scheduler";
import { startFinanceScheduler } from "./modules/finance/finance-scheduler";
import { startPaymentNotificationScheduler } from "./modules/finance/payment-notification-scheduler";
import { startReportScheduler } from "./modules/reports/report-scheduler";
import { startTasksScheduler } from "./modules/tasks/tasks-scheduler";
import { whatsAppService } from "./modules/whatsapp/whatsapp.service";
import { startWhatsAppScheduler } from "./modules/whatsapp/whatsapp-scheduler";

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`Pegasus Manager API running on port ${PORT}`);
  await whatsAppService.init();
  startWhatsAppScheduler();
  startTasksScheduler();
  startFinanceScheduler();
  startPaymentNotificationScheduler();
  startAnnouncementsScheduler();
  startReportScheduler();
});
