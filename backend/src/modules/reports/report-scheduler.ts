import cron from "node-cron";
import { reportsService } from "./reports.service";

export function startReportScheduler(): void {
  // 1st of every month at 06:00 UTC (03:00 BRT)
  cron.schedule("0 6 1 * *", async () => {
    const prevMonth = new Date();
    prevMonth.setUTCMonth(prevMonth.getUTCMonth() - 1);
    const month = prevMonth.toISOString().slice(0, 7);
    console.log(`[Scheduler] Generating monthly report for ${month}`);
    try {
      await reportsService.generate(month);
      console.log(`[Scheduler] Monthly report for ${month} generated successfully.`);
    } catch (err) {
      console.error(`[Scheduler] Failed to generate monthly report for ${month}:`, err);
    }
  });

  console.log("[Scheduler] Report scheduler started (1st of each month at 03:00 BRT)");
}
