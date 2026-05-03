import type { RequestHandler } from "express";
import { permissionsService } from "./permissions.service";

export const permissionsController = {
  findAll: (async (_request, response, next) => {
    try {
      const permissions = await permissionsService.findAll();
      response.json(permissions);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,
};
