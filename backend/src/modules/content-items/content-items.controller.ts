import type { RequestHandler } from "express";
import { contentItemsService } from "./content-items.service";

function getParamId(id: string | string[]) {
  return Array.isArray(id) ? id[0] : id;
}

function toDateRange(dateStr: string) {
  // Semana começa na segunda-feira que contém `dateStr` (ou o próprio dia, se já for segunda).
  const ref = new Date(`${dateStr}T12:00:00.000Z`);
  const weekday = ref.getUTCDay(); // 0 = domingo
  const diffToMonday = weekday === 0 ? -6 : 1 - weekday;
  const monday = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate() + diffToMonday));
  const nextMonday = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 7));
  return { start: monday, end: nextMonday };
}

export const contentItemsController = {
  findForWeek: (async (request, response, next) => {
    try {
      const dateStr = typeof request.query.date === "string" ? request.query.date : new Date().toISOString().slice(0, 10);
      const { start, end } = toDateRange(dateStr);
      const { items, events } = await contentItemsService.findForWeek(start, end);
      response.json({ weekStart: start.toISOString().slice(0, 10), items, events });
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  create: (async (request, response, next) => {
    try {
      const item = await contentItemsService.create(request.body);
      response.status(201).json(item);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  update: (async (request, response, next) => {
    try {
      const item = await contentItemsService.update(getParamId(request.params.id), request.body);
      response.json(item);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  delete: (async (request, response, next) => {
    try {
      await contentItemsService.delete(getParamId(request.params.id));
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,
};
