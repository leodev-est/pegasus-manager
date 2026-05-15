import { NextFunction, Request, Response } from "express";
import { auditService } from "./audit.service";

export const auditController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const entity = req.query.entity as string | undefined;
      const userId = req.query.userId as string | undefined;
      const logs = await auditService.list({ entity, userId, limit: 300 });
      res.json(logs);
    } catch (err) {
      next(err);
    }
  },
};
