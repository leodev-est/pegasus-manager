import { prisma } from "../../config/prisma";
import { googleCalendarService } from "../google-calendar/google-calendar.service";
import { whatsAppService } from "../whatsapp/whatsapp.service";

type TrainingConfigData = {
  trainingTime?: string;
  trainingLocation?: string;
  trainingDependency?: string;
  trainingDaysOfWeek?: string[];
  trainingDuration?: number;
  defaultTrainingCategory?: string;
  monthlyFeeAmount?: number;
  overduePaymentDays?: number;
  maxAbsencesPercentage?: number;
  minAttendanceToEvaluate?: number;
  notifyOnApproval?: boolean;
  notifyOnOverdue?: boolean;
  notifyOnTraining?: boolean;
  systemName?: string;
  timezone?: string;
  pixKey?: string | null;
  pixProvider?: string | null;
  pixApiKey?: string | null;
  pixWebhookSecret?: string | null;
  emailEnabled?: boolean;
  emailFallbackEnabled?: boolean;
  emailHost?: string | null;
  emailPort?: number | null;
  emailSecure?: boolean;
  emailUser?: string | null;
  emailPassword?: string | null;
  emailFrom?: string | null;
  emailFromName?: string;
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
    const currentEventIds = await this.getBlockedDateEventIds();
    const isBlocking = !current.includes(date);
    const next = isBlocking ? [...current, date] : current.filter((d) => d !== date);

    if (isBlocking) {
      const eventId = await googleCalendarService.syncBlockedDateCreate(date).catch(() => null);
      if (eventId) {
        currentEventIds[date] = eventId;
        await prisma.trainingSetting.upsert({
          where: { id: "singleton" },
          update: { blockedDateEventIds: currentEventIds },
          create: { id: "singleton", blockedDates: next, blockedDateEventIds: currentEventIds },
        });
      }
      whatsAppService.notifyTrainingCancelled(date).catch(() => {});
    } else {
      const eventId = currentEventIds[date];
      if (eventId) {
        googleCalendarService.syncBlockedDateDelete(eventId).catch(() => {});
        delete currentEventIds[date];
        await prisma.trainingSetting.upsert({
          where: { id: "singleton" },
          update: { blockedDateEventIds: currentEventIds },
          create: { id: "singleton", blockedDates: next, blockedDateEventIds: currentEventIds },
        });
      }
    }

    return this.setBlockedDates(next);
  },

  async getBlockedDateEventIds(): Promise<Record<string, string>> {
    const setting = await prisma.trainingSetting.findUnique({ where: { id: "singleton" } });
    const raw = setting?.blockedDateEventIds;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      return raw as Record<string, string>;
    }
    return {};
  },

  async getTrainingConfig() {
    return prisma.trainingSetting.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton", blockedDates: [] },
    });
  },

  async updateTrainingConfig(data: TrainingConfigData) {
    const update: Record<string, unknown> = {};
    const fields = [
      "trainingTime", "trainingLocation", "trainingDependency", "trainingDaysOfWeek",
      "trainingDuration", "defaultTrainingCategory", "monthlyFeeAmount", "overduePaymentDays",
      "maxAbsencesPercentage", "minAttendanceToEvaluate", "notifyOnApproval", "notifyOnOverdue",
      "notifyOnTraining", "systemName", "timezone", "pixKey", "pixProvider", "pixApiKey",
      "pixWebhookSecret", "emailEnabled", "emailFallbackEnabled", "emailHost", "emailPort",
      "emailSecure", "emailUser", "emailPassword", "emailFrom", "emailFromName",
    ] as const;
    for (const field of fields) {
      if ((data as Record<string, unknown>)[field] !== undefined) {
        update[field] = (data as Record<string, unknown>)[field];
      }
    }

    return prisma.trainingSetting.upsert({
      where: { id: "singleton" },
      update,
      create: { id: "singleton", blockedDates: [] },
    });
  },
};
