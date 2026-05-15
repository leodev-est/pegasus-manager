import type { RequestHandler } from "express";
import { suggestionsService } from "./suggestions.service";

export const suggestionsController = {
  create: (async (req, res, next) => {
    try {
      const { message, anonymous, authorName } = req.body as {
        message: string;
        anonymous?: boolean;
        authorName?: string;
      };

      const suggestion = await suggestionsService.create({
        message,
        anonymous,
        authorId: anonymous ? undefined : req.user?.id,
        authorName: anonymous ? undefined : (req.user?.name ?? authorName),
      });

      res.status(201).json(suggestion);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  findAll: (async (req, res, next) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      res.json(await suggestionsService.findAll(status));
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  update: (async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status, response } = req.body as { status?: string; response?: string };
      res.json(await suggestionsService.update(id, { status, response }));
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,
};
