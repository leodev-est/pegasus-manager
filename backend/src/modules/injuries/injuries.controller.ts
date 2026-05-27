import type { RequestHandler } from "express";
import { injuriesService } from "./injuries.service";

export const injuriesController = {
  list: (async (req, res, next) => {
    try {
      const athleteId = typeof req.query.athleteId === "string" ? req.query.athleteId : undefined;
      res.json(await injuriesService.list(athleteId));
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  listMine: (async (req, res, next) => {
    try {
      const athleteId = req.user?.athleteId;
      if (!athleteId) return res.json([]);
      res.json(await injuriesService.listForAthlete(athleteId));
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  create: (async (req, res, next) => {
    try {
      const body = req.body as {
        athleteId: string;
        type: string;
        severity: string;
        description?: string;
        startDate: string;
        expectedReturn?: string;
        notes?: string;
      };
      const injury = await injuriesService.create({ ...body, createdBy: req.user?.name });
      res.status(201).json(injury);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  update: (async (req, res, next) => {
    try {
      const injury = await injuriesService.update(req.params.id, req.body);
      res.json(injury);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  remove: (async (req, res, next) => {
    try {
      await injuriesService.remove(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,
};
