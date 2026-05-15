import { Request, Response, NextFunction } from "express";
import { gamesService } from "./games.service";

export const gamesController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const month = req.query.month as string | undefined;
      const games = await gamesService.findAll(month);
      res.json(games);
    } catch (err) {
      next(err);
    }
  },

  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const month = req.query.month as string | undefined;
      const stats = await gamesService.getStats(month);
      res.json(stats);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const game = await gamesService.findById(req.params.id);
      res.json(game);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const game = await gamesService.create(req.body);
      res.status(201).json(game);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const game = await gamesService.update(req.params.id, req.body);
      res.json(game);
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await gamesService.delete(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async upsertSet(req: Request, res: Response, next: NextFunction) {
    try {
      const set = await gamesService.upsertSet(req.params.id, req.body);
      res.json(set);
    } catch (err) {
      next(err);
    }
  },

  async deleteSet(req: Request, res: Response, next: NextFunction) {
    try {
      await gamesService.deleteSet(req.params.id, Number(req.params.setNumber));
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
