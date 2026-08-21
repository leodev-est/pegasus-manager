import type { RequestHandler } from "express";
import { calendarService } from "./calendar.service";

export const calendarController = {
  getBlockedDates: (async (_req, res) => {
    const dates = await calendarService.getBlockedDates();
    res.json({ blockedDates: dates });
  }) as RequestHandler,

  setBlockedDates: (async (req, res) => {
    const { blockedDates } = req.body as { blockedDates: string[] };
    if (!Array.isArray(blockedDates)) {
      res.status(400).json({ message: "blockedDates deve ser uma lista" });
      return;
    }
    const dates = await calendarService.setBlockedDates(blockedDates);
    res.json({ blockedDates: dates });
  }) as RequestHandler,

  toggleBlockedDate: (async (req, res) => {
    const { date } = req.body as { date: string };
    if (!date || typeof date !== "string") {
      res.status(400).json({ message: "date é obrigatório" });
      return;
    }
    const dates = await calendarService.toggleBlockedDate(date);
    res.json({ blockedDates: dates });
  }) as RequestHandler,

  getTrainingConfig: (async (_req, res) => {
    const config = await calendarService.getTrainingConfig();
    res.json({
      trainingTime: config.trainingTime,
      trainingLocation: config.trainingLocation,
      trainingDependency: config.trainingDependency,
      trainingDaysOfWeek: config.trainingDaysOfWeek,
      trainingDuration: config.trainingDuration,
      defaultTrainingCategory: config.defaultTrainingCategory,
      monthlyFeeAmount: Number(config.monthlyFeeAmount),
      overduePaymentDays: config.overduePaymentDays,
      maxAbsencesPercentage: config.maxAbsencesPercentage,
      minAttendanceToEvaluate: config.minAttendanceToEvaluate,
      notifyOnApproval: config.notifyOnApproval,
      notifyOnOverdue: config.notifyOnOverdue,
      notifyOnTraining: config.notifyOnTraining,
      systemName: config.systemName,
      timezone: config.timezone,
      blockedDates: config.blockedDates,
      pixKey: config.pixKey,
      pixProvider: config.pixProvider,
      pixApiKey: config.pixApiKey ? "***" : null,
      emailEnabled: config.emailEnabled,
      emailFallbackEnabled: config.emailFallbackEnabled,
      emailHost: config.emailHost,
      emailPort: config.emailPort,
      emailSecure: config.emailSecure,
      emailUser: config.emailUser,
      emailPassword: config.emailPassword ? "***" : null,
      emailFrom: config.emailFrom,
      emailFromName: config.emailFromName,
    });
  }) as RequestHandler,

  updateTrainingConfig: (async (req, res) => {
    const body = req.body as Record<string, unknown>;
    const allowed = [
      "trainingTime", "trainingLocation", "trainingDependency", "trainingDaysOfWeek",
      "trainingDuration", "defaultTrainingCategory", "monthlyFeeAmount", "overduePaymentDays",
      "maxAbsencesPercentage", "minAttendanceToEvaluate", "notifyOnApproval", "notifyOnOverdue",
      "notifyOnTraining", "systemName", "timezone", "pixKey", "pixProvider", "pixApiKey",
      "pixWebhookSecret", "emailEnabled", "emailFallbackEnabled", "emailHost", "emailPort",
      "emailSecure", "emailUser", "emailPassword", "emailFrom", "emailFromName",
    ];
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key];
    }

    const config = await calendarService.updateTrainingConfig(update as Parameters<typeof calendarService.updateTrainingConfig>[0]);
    res.json({
      trainingTime: config.trainingTime,
      trainingLocation: config.trainingLocation,
      trainingDependency: config.trainingDependency,
      trainingDaysOfWeek: config.trainingDaysOfWeek,
      trainingDuration: config.trainingDuration,
      defaultTrainingCategory: config.defaultTrainingCategory,
      monthlyFeeAmount: Number(config.monthlyFeeAmount),
      overduePaymentDays: config.overduePaymentDays,
      maxAbsencesPercentage: config.maxAbsencesPercentage,
      minAttendanceToEvaluate: config.minAttendanceToEvaluate,
      notifyOnApproval: config.notifyOnApproval,
      notifyOnOverdue: config.notifyOnOverdue,
      notifyOnTraining: config.notifyOnTraining,
      systemName: config.systemName,
      timezone: config.timezone,
      blockedDates: config.blockedDates,
      pixKey: config.pixKey,
      pixProvider: config.pixProvider,
      emailEnabled: config.emailEnabled,
      emailFallbackEnabled: config.emailFallbackEnabled,
      emailHost: config.emailHost,
      emailPort: config.emailPort,
      emailSecure: config.emailSecure,
      emailUser: config.emailUser,
      emailFrom: config.emailFrom,
      emailFromName: config.emailFromName,
    });
  }) as RequestHandler,
};
