import { Request, Response, NextFunction } from "express";
import { jerseyService } from "./jersey.service";

export const jerseyController = {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const gender = (req.query.gender as string) || "masculino";
      const data = await jerseyService.findAll(gender);
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async assign(req: Request, res: Response, next: NextFunction) {
    try {
      const number = parseInt(req.params.number, 10);
      const gender = req.params.gender;
      const { athleteId } = req.body as { athleteId: string };
      if (!athleteId) {
        res.status(400).json({ error: "athleteId é obrigatório" });
        return;
      }
      const result = await jerseyService.assign(number, gender, athleteId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async unassign(req: Request, res: Response, next: NextFunction) {
    try {
      const number = parseInt(req.params.number, 10);
      const gender = req.params.gender;
      await jerseyService.unassign(number, gender);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
};
