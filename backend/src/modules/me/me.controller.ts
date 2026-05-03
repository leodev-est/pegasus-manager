import type { RequestHandler } from "express";
import { meService } from "./me.service";

export const meController = {
  getProfile: (async (request, response, next) => {
    try {
      response.json(await meService.getProfile(request.user!.id));
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  updateProfile: (async (request, response, next) => {
    try {
      response.json(await meService.updateProfile(request.user!.id, request.body));
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,
};
