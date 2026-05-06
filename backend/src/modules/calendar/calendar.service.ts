import { prisma } from "../../config/prisma";
import { whatsAppService } from "../whatsapp/whatsapp.service";

export const calendarService = {
  async getBlockedDates(): Promise<string[]> {
    const setting = await prisma.trainingSetting.findUnique({
      where: { id: "singleton" },
    });
    return setting?.blockedDates ?? [];
  },

  async setBlockedDates(dates: string[]): Promise<string[]> {
    const setting = await prisma.trainingSetting.upsert({
      where: { id: "singleton" },
      update: { blockedDates: dates },
      create: { id: "singleton", blockedDates: dates },
    });
    return setting.blockedDates;
  },

  async toggleBlockedDate(date: string): Promise<string[]> {
    const current = await this.getBlockedDates();
    const isBlocking = !current.includes(date);
    const next = isBlocking ? [...current, date] : current.filter((d) => d !== date);
    const result = await this.setBlockedDates(next);
    if (isBlocking) {
      whatsAppService.notifyTrainingCancelled(date).catch(() => {});
    }
    return result;
  },
};
