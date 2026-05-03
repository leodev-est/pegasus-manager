import type { RequestHandler } from "express";
import { trainingsService } from "./trainings.service";

function getParamId(id: string | string[]) {
  return Array.isArray(id) ? id[0] : id;
}

function getQueryParam(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

export const trainingsController = {
  findAll: (async (request, response, next) => {
    try {
      const trainings = await trainingsService.findAll({
        category: getQueryParam(request.query.category),
        month: getQueryParam(request.query.month),
        search: getQueryParam(request.query.search),
      });
      response.json(trainings);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  findById: (async (request, response, next) => {
    try {
      const training = await trainingsService.findById(getParamId(request.params.id));
      response.json(training);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  create: (async (request, response, next) => {
    try {
      const training = await trainingsService.create(request.body);
      response.status(201).json(training);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  update: (async (request, response, next) => {
    try {
      const training = await trainingsService.update(getParamId(request.params.id), request.body);
      response.json(training);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  delete: (async (request, response, next) => {
    try {
      await trainingsService.delete(getParamId(request.params.id));
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,
};
