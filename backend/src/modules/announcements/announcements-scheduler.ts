import cron from "node-cron";
import { announcementsService } from "./announcements.service";

export function startAnnouncementsScheduler(): void {
  // Every minute — check for pending scheduled announcements
  cron.schedule("* * * * *", async () => {
    await announcementsService.processPending().catch(() => {});
  });
  console.log("[Announcements Scheduler] Started (every minute)");
}
