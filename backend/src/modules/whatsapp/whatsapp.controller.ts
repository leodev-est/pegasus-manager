import type { Request, Response } from "express";
import { whatsAppService } from "./whatsapp.service";

export const whatsAppController = {
  getStatus(req: Request, res: Response) {
    res.json({
      status: whatsAppService.getStatus(),
      qrDataUrl: whatsAppService.getQrDataUrl(),
    });
  },

  async connect(req: Request, res: Response) {
    await whatsAppService.connect();
    res.json({ status: whatsAppService.getStatus() });
  },

  async disconnect(req: Request, res: Response) {
    await whatsAppService.disconnect();
    res.json({ status: "disconnected" });
  },
};
