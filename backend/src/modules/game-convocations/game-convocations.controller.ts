import type { Request, Response } from "express";
import { gameConvocationsService } from "./game-convocations.service";

export const gameConvocationsController = {
  async getByGame(req: Request, res: Response) {
    const data = await gameConvocationsService.getByGame(req.params.gameId);
    res.json(data);
  },

  async upsert(req: Request, res: Response) {
    const { gameId, athleteId } = req.params;
    const { status, notes } = req.body;
    const result = await gameConvocationsService.upsertConvocation(gameId, athleteId, status, notes);
    res.json(result);
  },

  async remove(req: Request, res: Response) {
    const { gameId, athleteId } = req.params;
    await gameConvocationsService.removeConvocation(gameId, athleteId);
    res.status(204).send();
  },

  async bulkSet(req: Request, res: Response) {
    const { gameId } = req.params;
    const { athleteIds } = req.body as { athleteIds: string[] };
    const result = await gameConvocationsService.bulkSet(gameId, athleteIds ?? []);
    res.json(result);
  },
};
