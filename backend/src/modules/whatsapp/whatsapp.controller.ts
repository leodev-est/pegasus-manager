import type { Request, Response } from "express";
import { whatsAppService } from "./whatsapp.service";

export const whatsAppController = {
  getStatus(req: Request, res: Response) {
    res.json({
      status: whatsAppService.getStatus(),
      qrDataUrl: whatsAppService.getQrDataUrl(),
      lastError: whatsAppService.getLastError(),
    });
  },

  async connect(req: Request, res: Response) {
    await whatsAppService.connect();
    res.json({
      status: whatsAppService.getStatus(),
      qrDataUrl: whatsAppService.getQrDataUrl(),
      lastError: whatsAppService.getLastError(),
    });
  },

  async disconnect(req: Request, res: Response) {
    await whatsAppService.disconnect();
    res.json({ status: "disconnected" });
  },

  async getGroups(req: Request, res: Response) {
    const groups = await whatsAppService.getGroups();
    res.json({ groups, status: whatsAppService.getStatus() });
  },

  async sendBroadcast(req: Request, res: Response) {
    const { targets, message } = req.body as { targets?: string[]; message?: string };

    if (!message?.trim()) {
      res.status(400).json({ error: "Mensagem é obrigatória." });
      return;
    }
    if (!Array.isArray(targets) || targets.length === 0) {
      res.status(400).json({ error: "Selecione pelo menos um destinatário." });
      return;
    }

    try {
      const result = await whatsAppService.sendBroadcast(targets, message.trim());
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message ?? "Erro ao enviar mensagens." });
    }
  },
};
