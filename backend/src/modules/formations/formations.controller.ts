import type { RequestHandler } from "express";
import { formationsService } from "./formations.service";

function getParamId(id: string | string[]) {
  return Array.isArray(id) ? id[0] : id;
}

export const formationsController = {
  findAll: (async (_request, response, next) => {
    try {
      const formations = await formationsService.findAll();
      response.json(formations);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  create: (async (request, response, next) => {
    try {
      const formation = await formationsService.create(request.body);
      response.status(201).json(formation);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  update: (async (request, response, next) => {
    try {
      const formation = await formationsService.update(getParamId(request.params.id), request.body);
      response.json(formation);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  delete: (async (request, response, next) => {
    try {
      await formationsService.delete(getParamId(request.params.id));
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,
};
