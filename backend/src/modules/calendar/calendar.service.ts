import { prisma } from "../../config/prisma";
import { whatsAppService } from "../whatsapp/whatsapp.service";

type TrainingConfigData = {
  trainingTime?: string;
  trainingLocation?: string;
  trainingDependency?: string;
  monthlyFeeAmount?: number;
};

export const calendarService = {
  async getBlockedDates(): Promise<string[]> {
    const setting = await prisma.trainingSetting.findUnique({
      where: { id: "singleton" },
    });
    return setting?.blockedDates ?? [];
  },

  async setBlockedDates(dates: string[]): Promise<string[]> {
    const deduped = [...new Set(dates)].sort();
    const setting = await prisma.trainingSetting.upsert({
      where: { id: "singleton" },
      update: { blockedDates: deduped },
      create: { id: "singleton", blockedDates: deduped },
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

  async getTrainingConfig() {
    return prisma.trainingSetting.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton", blockedDates: [] },
    });
  },

  async updateTrainingConfig(data: TrainingConfigData) {
    return prisma.trainingSetting.upsert({
      where: { id: "singleton" },
      update: {
        ...(data.trainingTime !== undefined && { trainingTime: data.trainingTime }),
        ...(data.trainingLocation !== undefined && { trainingLocation: data.trainingLocation }),
        ...(data.trainingDependency !== undefined && { trainingDependency: data.trainingDependency }),
        ...(data.monthlyFeeAmount !== undefined && { monthlyFeeAmount: data.monthlyFeeAmount }),
      },
      create: { id: "singleton", blockedDates: [] },
    });
  },
};
