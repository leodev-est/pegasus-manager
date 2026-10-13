import type { RequestHandler } from "express";
import { referencesService } from "./references.service";

function getParamId(id: string | string[]) {
  return Array.isArray(id) ? id[0] : id;
}

function q(value: unknown) {
  return typeof value === "string" && value ? value : undefined;
}

function actorOf(request: { user?: { id: string; name: string } }) {
  return request.user ? { id: request.user.id, name: request.user.name } : undefined;
}

export const referencesController = {
  findAll: (async (request, response, next) => {
    try {
      response.json(
        await referencesService.findAll({ status: q(request.query.status), tag: q(request.query.tag), search: q(request.query.search) }),
      );
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  create: (async (request, response, next) => {
    try {
      response.status(201).json(await referencesService.create(request.body, actorOf(request)));
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  update: (async (request, response, next) => {
    try {
      response.json(await referencesService.update(getParamId(request.params.id), request.body));
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  toTask: (async (request, response, next) => {
    try {
      response.status(201).json(await referencesService.toTask(getParamId(request.params.id), request.body, actorOf(request)));
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  delete: (async (request, response, next) => {
    try {
      await referencesService.delete(getParamId(request.params.id));
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,
};
