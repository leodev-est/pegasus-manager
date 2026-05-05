import { prisma } from "../../config/prisma";

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
    const next = current.includes(date)
      ? current.filter((d) => d !== date)
      : [...current, date];
    return this.setBlockedDates(next);
  },
};
