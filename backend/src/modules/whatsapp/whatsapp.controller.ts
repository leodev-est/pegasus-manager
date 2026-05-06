import type { Request, Response } from "express";
import { whatsAppService } from "./whatsapp.service";


export const whatsAppController = {
  /** Receives webhook events from Evolution API (no auth required). */
  async webhook(req: Request, res: Response) {
    res.sendStatus(200); // respond immediately so Evolution API doesn't retry
    const body = req.body ?? {};
    const event: string = (body.event ?? "").toLowerCase();
    const data = body.data ?? {};

    if (event === "qrcode.updated") {
      const b64: string | undefined = data?.qrcode?.base64 ?? data?.base64;
      if (b64) {
        whatsAppService.setQr(b64);
        console.log("[WhatsApp] QR recebido via webhook");
      }
    }

    if (event === "connection.update") {
      const state: string = data?.state ?? data?.connection ?? "";
      if (state === "open") {
        whatsAppService.setConnected();
        console.log("[WhatsApp] Conectado via webhook");
      } else if (state === "close" || state === "closed") {
        whatsAppService.setDisconnected();
        console.log("[WhatsApp] Desconectado via webhook");
      }
    }
  },

  async getStatus(req: Request, res: Response) {
    const state = await whatsAppService.getFullStatus();
    res.json(state);
  },

  async connect(req: Request, res: Response) {
    await whatsAppService.connect();
    const state = await whatsAppService.getFullStatus();
    res.json(state);
  },

  async disconnect(req: Request, res: Response) {
    await whatsAppService.disconnect();
    res.json({ status: "disconnected", qrDataUrl: null, lastError: null });
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
