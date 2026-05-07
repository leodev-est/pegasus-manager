import { api } from "./api";

export type WhatsAppStatus = "disconnected" | "connecting" | "connected";

export type WhatsAppState = {
  status: WhatsAppStatus;
  qrDataUrl: string | null;
  lastError: string | null;
};

export type WhatsAppGroup = {
  id: string;
  name: string;
  participants: number;
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

  async getGroups(): Promise<{ groups: WhatsAppGroup[]; status: WhatsAppStatus }> {
    const { data } = await api.get<{ groups: WhatsAppGroup[]; status: WhatsAppStatus }>("/whatsapp/groups");
    return data;
  },

  async getPairingCode(phone: string): Promise<string> {
    const { data } = await api.post<{ code: string }>("/whatsapp/pairing-code", { phone });
    return data.code;
  },

  async sendBroadcast(targets: string[], message: string): Promise<{ sent: number; failed: number }> {
    const { data } = await api.post<{ sent: number; failed: number }>("/whatsapp/broadcast", { targets, message });
    return data;
  },
};
