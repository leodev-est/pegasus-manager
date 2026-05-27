import type { RequestHandler } from "express";
import { trainingPlansService } from "./training-plans.service";

export const trainingPlansController = {
  list: (async (req, res, next) => {
    try {
      const athleteId = typeof req.query.athleteId === "string" ? req.query.athleteId : undefined;
      res.json(await trainingPlansService.list(athleteId));
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  getMine: (async (req, res, next) => {
    try {
      const athleteId = req.user?.athleteId;
      if (!athleteId) return res.json(null);
      res.json(await trainingPlansService.getActivePlan(athleteId));
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  create: (async (req, res, next) => {
    try {
      const plan = await trainingPlansService.create({
        ...req.body,
        createdBy: req.user?.name,
      });
      res.status(201).json(plan);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  update: (async (req, res, next) => {
    try {
      res.json(await trainingPlansService.update(req.params.id, req.body));
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  remove: (async (req, res, next) => {
    try {
      await trainingPlansService.remove(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,
};
