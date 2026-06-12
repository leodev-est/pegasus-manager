import type { RequestHandler } from "express";
import { marketingCalendarService } from "./marketing-calendar.service";

export const marketingCalendarController = {
  getEvents: (async (req, res, next) => {
    try {
      const month = Number(req.query.month) || new Date().getMonth() + 1;
      const year = Number(req.query.year) || new Date().getFullYear();
      const events = await marketingCalendarService.getEventsForMonth(year, month);
      res.json(events);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  createEvent: (async (req, res, next) => {
    try {
      const user = (req as { user?: { name?: string } }).user;
      const event = await marketingCalendarService.createEvent({
        ...req.body,
        createdBy: user?.name ?? null,
      });
      res.status(201).json(event);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  updateEvent: (async (req, res, next) => {
    try {
      const event = await marketingCalendarService.updateEvent(req.params.id, req.body);
      res.json(event);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  deleteEvent: (async (req, res, next) => {
    try {
      await marketingCalendarService.deleteEvent(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,
};
