import type { RequestHandler } from "express";
import { rolesService } from "./roles.service";

function getParamId(id: string | string[]) {
  return Array.isArray(id) ? id[0] : id;
}

export const rolesController = {
  findAll: (async (_request, response, next) => {
    try {
      const roles = await rolesService.findAll();
      response.json(roles);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  create: (async (request, response, next) => {
    try {
      const role = await rolesService.create(request.body);
      response.status(201).json(role);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  update: (async (request, response, next) => {
    try {
      const role = await rolesService.update(getParamId(request.params.id), request.body);
      response.json(role);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,
};
