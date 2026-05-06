import { api } from "./api";

export type WhatsAppStatus = "disconnected" | "connecting" | "connected";

export type WhatsAppState = {
  status: WhatsAppStatus;
  qrDataUrl: string | null;
  lastError: string | null;
};

export const whatsappService = {
  async getStatus(): Promise<WhatsAppState> {
    const { data } = await api.get<WhatsAppState>("/whatsapp/status");
    return data;
  },

  async connect(): Promise<WhatsAppState> {
    const { data } = await api.post<WhatsAppState>("/whatsapp/connect");
    return data;
  },

  async disconnect(): Promise<void> {
    await api.post("/whatsapp/disconnect");
  },
};
