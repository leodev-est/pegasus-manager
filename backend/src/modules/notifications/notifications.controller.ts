import type { RequestHandler } from "express";
import { notificationsService } from "./notifications.service";

function getParamId(id: string | string[]) {
  return Array.isArray(id) ? id[0] : id;
}

export const notificationsController = {
  findMine: (async (request, response, next) => {
    try {
      response.json(await notificationsService.findMine(request.user!.id));
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  markAsRead: (async (request, response, next) => {
    try {
      response.json(await notificationsService.markAsRead(request.user!.id, getParamId(request.params.id)));
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  markAllAsRead: (async (request, response, next) => {
    try {
      response.json(await notificationsService.markAllAsRead(request.user!.id));
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  create: (async (request, response, next) => {
    try {
      response.status(201).json(await notificationsService.create(request.body));
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,
};
