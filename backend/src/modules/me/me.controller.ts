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

  uploadAvatar: (async (request, response, next) => {
    try {
      const file = (request as typeof request & { file?: Express.Multer.File }).file;
      if (!file) {
        response.status(400).json({ message: "Nenhum arquivo enviado" });
        return;
      }
      const result = await meService.updateAvatar(request.user!.id, file.buffer, file.mimetype);
      response.json(result);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,
};
