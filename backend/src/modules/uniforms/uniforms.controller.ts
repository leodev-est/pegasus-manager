import { Request, Response, NextFunction } from "express";
import { uniformsService } from "./uniforms.service";

export const uniformsController = {
  async getAllItems(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await uniformsService.findAllItems());
    } catch (err) {
      next(err);
    }
  },

  async getItemById(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await uniformsService.findItemById(req.params.id));
    } catch (err) {
      next(err);
    }
  },

  async createItem(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json(await uniformsService.createItem(req.body));
    } catch (err) {
      next(err);
    }
  },

  async updateItem(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await uniformsService.updateItem(req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  },

  async deleteItem(req: Request, res: Response, next: NextFunction) {
    try {
      await uniformsService.deleteItem(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async getDeliveries(req: Request, res: Response, next: NextFunction) {
    try {
      const athleteId = req.query.athleteId as string | undefined;
      const uniformItemId = req.query.uniformItemId as string | undefined;
      res.json(await uniformsService.getDeliveries(athleteId, uniformItemId));
    } catch (err) {
      next(err);
    }
  },

  async createDelivery(req: Request, res: Response, next: NextFunction) {
    try {
      const deliveredBy = (req as Request & { user?: { name?: string; username?: string } }).user?.name || "Sistema";
      res.status(201).json(await uniformsService.createDelivery(req.body, deliveredBy));
    } catch (err) {
      next(err);
    }
  },

  async deleteDelivery(req: Request, res: Response, next: NextFunction) {
    try {
      await uniformsService.deleteDelivery(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async getLowStock(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await uniformsService.getLowStockItems());
    } catch (err) {
      next(err);
    }
  },
};
