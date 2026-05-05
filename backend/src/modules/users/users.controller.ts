import type { RequestHandler } from "express";
import { usersService } from "./users.service";

function getParamId(id: string | string[]) {
  return Array.isArray(id) ? id[0] : id;
}

export const usersController = {
  findAll: (async (request, response, next) => {
    try {
      const includeInactive = request.query.includeInactive === "true";
      const users = await usersService.findAll(includeInactive);
      response.json(users);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  create: (async (request, response, next) => {
    try {
      const user = await usersService.create(request.body);
      response.status(201).json(user);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  update: (async (request, response, next) => {
    try {
      const user = await usersService.update(getParamId(request.params.id), request.body);
      response.json(user);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  updateRoles: (async (request, response, next) => {
    try {
      const roles = Array.isArray(request.body.roles) ? request.body.roles : [];
      const user = await usersService.updateRoles(getParamId(request.params.id), roles);
      response.json(user);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  softDelete: (async (request, response, next) => {
    try {
      const user = await usersService.softDelete(getParamId(request.params.id));
      response.json(user);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  findByRole: (async (request, response, next) => {
    try {
      const users = await usersService.findByRole(String(request.params.role));
      response.json(users);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,
};
