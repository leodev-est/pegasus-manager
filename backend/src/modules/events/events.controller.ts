import type { RequestHandler } from "express";
import { eventsService } from "./events.service";

function getParamId(id: string | string[]) {
  return Array.isArray(id) ? id[0] : id;
}

export const eventsController = {
  findAll: (async (_request, response, next) => {
    try {
      const events = await eventsService.findAll();
      response.json(events);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  create: (async (request, response, next) => {
    try {
      const user = (request as { user?: { name?: string } }).user;
      const event = await eventsService.create({ ...request.body, createdBy: user?.name ?? null });
      response.status(201).json(event);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  update: (async (request, response, next) => {
    try {
      const event = await eventsService.update(getParamId(request.params.id), request.body);
      response.json(event);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  delete: (async (request, response, next) => {
    try {
      await eventsService.delete(getParamId(request.params.id));
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,
};
