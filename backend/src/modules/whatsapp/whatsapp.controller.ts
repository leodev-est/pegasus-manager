import type { Request, Response } from "express";
import { whatsAppService } from "./whatsapp.service";


export const whatsAppController = {
  /** Receives webhook events from Evolution API (no auth required). */
  async webhook(req: Request, res: Response) {
    res.sendStatus(200); // respond immediately so Evolution API doesn't retry
    const body = req.body ?? {};
    const event: string = body.event ?? "";
    const data = body.data ?? {};
    const state: string = data?.state ?? data?.connection ?? "";

    // Log every event for diagnostics
    console.log(`[WH] event="${event}" state="${state}" keys=${Object.keys(data).join(",")}`);

    const ev = event.toLowerCase();

    if (ev.includes("qr")) {
      console.log("[WH] QR-like event body:", JSON.stringify(body).slice(0, 400));
    }

    if (ev === "pairing.code" || ev === "pairing_code" || ev === "pairingcode") {
      const code: string | undefined = data?.pairingCode ?? data?.pairing_code ?? data?.code;
      if (code) {
        whatsAppService.setPairingCode(code);
        console.log("[WhatsApp] Pairing code recebido via webhook:", code);
      }
    }

    if (ev === "qrcode.updated" || ev === "qrcode_updated") {
      const b64: string | undefined = data?.qrcode?.base64 ?? data?.base64;
      if (b64) {
        whatsAppService.setQr(b64);
        console.log("[WhatsApp] QR recebido via webhook");
      } else {
        console.log("[WhatsApp] QR event sem base64:", JSON.stringify(data).slice(0, 200));
      }
    }

    if (ev === "connection.update" || ev === "connection_update") {
      // Some Evolution API versions embed QR inside connection.update
      const qrInUpdate: string | undefined =
        data?.qrcode?.base64 ?? data?.qr?.base64 ?? (typeof data?.qr === "string" ? data.qr : undefined);
      if (qrInUpdate) {
        whatsAppService.setQr(qrInUpdate);
        console.log("[WhatsApp] QR recebido via connection.update");
      } else if (state === "connecting") {
        // Log full data to diagnose missing QR
        console.log("[WH] connection.update connecting data:", JSON.stringify(data).slice(0, 300));
      }

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

  async pairingCode(req: Request, res: Response) {
    const { phone } = req.body as { phone?: string };
    if (!phone?.trim()) {
      res.status(400).json({ error: "Número de telefone é obrigatório." });
      return;
    }
    try {
      const code = await whatsAppService.getPairingCode(phone.trim());
      res.json({ code });
    } catch (err: any) {
      res.status(400).json({ error: err.message ?? "Erro ao gerar código de pareamento." });
    }
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
