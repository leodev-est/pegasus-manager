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
      monthlyFeeAmount: Number(config.monthlyFeeAmount),
    });
  }) as RequestHandler,

  updateTrainingConfig: (async (req, res) => {
    const { trainingTime, trainingLocation, trainingDependency, monthlyFeeAmount } = req.body as {
      trainingTime?: string;
      trainingLocation?: string;
      trainingDependency?: string;
      monthlyFeeAmount?: number;
    };
    const config = await calendarService.updateTrainingConfig({
      trainingTime,
      trainingLocation,
      trainingDependency,
      monthlyFeeAmount,
    });
    res.json({
      trainingTime: config.trainingTime,
      trainingLocation: config.trainingLocation,
      trainingDependency: config.trainingDependency,
      monthlyFeeAmount: Number(config.monthlyFeeAmount),
    });
  }) as RequestHandler,
};
