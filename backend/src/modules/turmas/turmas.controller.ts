import type { RequestHandler } from "express";
import { turmasService } from "./turmas.service";

function getParamId(id: string | string[]) {
  return Array.isArray(id) ? id[0] : id;
}

export const turmasController = {
  findAll: (async (_request, response, next) => {
    try {
      response.json(await turmasService.findAll());
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  findPublicActive: (async (_request, response, next) => {
    try {
      response.json(await turmasService.findPublicActive());
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  create: (async (request, response, next) => {
    try {
      const turma = await turmasService.create(request.body);
      response.status(201).json(turma);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  update: (async (request, response, next) => {
    try {
      const turma = await turmasService.update(getParamId(request.params.id), request.body);
      response.json(turma);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  delete: (async (request, response, next) => {
    try {
      await turmasService.delete(getParamId(request.params.id));
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,
};
