import { Request, Response, NextFunction } from "express";
import { pushService } from "./push.service";

export const pushController = {
  async getPublicKey(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(pushService.getPublicKey());
    } catch (err) {
      next(err);
    }
  },

  async subscribe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as typeof req & { user?: { id: string } }).user!.id;
      const sub = await pushService.subscribe(userId, req.body);
      res.status(201).json(sub);
    } catch (err) {
      next(err);
    }
  },

  async unsubscribe(req: Request, res: Response, next: NextFunction) {
    try {
      await pushService.unsubscribe(req.body.endpoint);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
