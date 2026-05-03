import type { RequestHandler } from "express";
import { spreadsheetsService } from "./spreadsheets.service";

function getParamId(id: string | string[]) {
  return Array.isArray(id) ? id[0] : id;
}

export const spreadsheetsController = {
  findAll: (async (_request, response, next) => {
    try {
      response.json(await spreadsheetsService.findAll());
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  create: (async (request, response, next) => {
    try {
      response.status(201).json(await spreadsheetsService.create(request.body));
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  update: (async (request, response, next) => {
    try {
      response.json(await spreadsheetsService.update(getParamId(request.params.id), request.body));
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  delete: (async (request, response, next) => {
    try {
      await spreadsheetsService.delete(getParamId(request.params.id));
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,
};
