import { prisma } from "../../config/prisma";

const raw = (process.env.EVOLUTION_API_URL ?? "").replace(/\/$/, "");
const EVOLUTION_URL = raw && !raw.startsWith("http") ? `https://${raw}` : raw;
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY ?? "";
const INSTANCE = process.env.EVOLUTION_INSTANCE_NAME ?? "pegasus";

// Backend's own public URL (used to configure Evolution API webhook)
const rawBackend = (process.env.BACKEND_URL ?? process.env.RAILWAY_PUBLIC_DOMAIN ?? "").replace(/\/$/, "");
const BACKEND_URL = rawBackend && !rawBackend.startsWith("http") ? `https://${rawBackend}` : rawBackend;
const WEBHOOK_URL = BACKEND_URL ? `${BACKEND_URL}/whatsapp/webhook` : "";

async function evo<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  if (!EVOLUTION_URL) throw new Error("EVOLUTION_API_URL não configurada no servidor.");
  const res = await fetch(`${EVOLUTION_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", apikey: EVOLUTION_KEY },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Evolution API ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

type ConnectionStatus = "disconnected" | "connecting" | "connected";

export type WhatsAppGroup = {
  id: string;
  name: string;
  participants: number;
};

/** Extract base64 QR from any known Evolution API response shape. */
function extractQrBase64(res: any): string | null {
  const b64 =
    res?.base64 ??
    res?.qrcode?.base64 ??
    res?.hash?.qrcode?.base64 ??
    res?.instance?.qrcode?.base64 ??
    res?.data?.qrcode?.base64;
  if (!b64) return null;
  return b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`;
}

class WhatsAppService {
  private status: ConnectionStatus = "disconnected";
  private lastError: string | null = null;
  private cachedQr: string | null = null;

  getStatus(): ConnectionStatus { return this.status; }
  getLastError(): string | null { return this.lastError; }

  /** Called by the webhook handler when Evolution API sends a QR event. */
  setQr(base64: string): void {
    this.cachedQr = base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;
    this.status = "connecting";
  }

  setConnected(): void {
    this.status = "connected";
    this.cachedQr = null;
    this.lastError = null;
  }

  setDisconnected(): void {
    this.status = "disconnected";
    this.cachedQr = null;
  }

  /** Called once on startup to restore a persisted session. */
  async init(): Promise<void> {
    if (!EVOLUTION_URL || !EVOLUTION_KEY) {
      console.log("[WhatsApp] Evolution API não configurada — defina EVOLUTION_API_URL e EVOLUTION_API_KEY");
      return;
    }
    try {
      const res = await evo<any>("GET", `/instance/connectionState/${INSTANCE}`);
      const state = res?.instance?.state ?? res?.state;
      if (state === "open") {
        this.status = "connected";
        console.log("[WhatsApp] Sessão restaurada pelo Evolution API — conectado");
      }
    } catch {
      // Instance doesn't exist yet — fine, user will connect manually
    }
  }

  async getFullStatus(): Promise<{ status: ConnectionStatus; qrDataUrl: string | null; lastError: string | null }> {
    if (this.status === "disconnected") {
      return { status: "disconnected", qrDataUrl: null, lastError: this.lastError };
    }

    if (!EVOLUTION_URL || !EVOLUTION_KEY) {
      this.status = "disconnected";
      this.lastError = "EVOLUTION_API_URL ou EVOLUTION_API_KEY não configuradas.";
      return { status: "disconnected", qrDataUrl: null, lastError: this.lastError };
    }

    try {
      const stateRes = await evo<any>("GET", `/instance/connectionState/${INSTANCE}`);
      const state = stateRes?.instance?.state ?? stateRes?.state;

      if (state === "open") {
        this.status = "connected";
        this.lastError = null;
        this.cachedQr = null;
        return { status: "connected", qrDataUrl: null, lastError: null };
      }

      if (!this.cachedQr) {
        try {
          const qrRes = await evo<any>("GET", `/instance/connect/${INSTANCE}`);
          const b64 = extractQrBase64(qrRes);
          if (b64) this.cachedQr = b64;
        } catch { /* not ready yet */ }
      }

      return { status: "connecting", qrDataUrl: this.cachedQr, lastError: null };
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error("[WhatsApp] Erro ao consultar Evolution API:", msg);
      this.status = "disconnected";
      this.lastError = `Erro ao contatar Evolution API: ${msg}`;
      return { status: "disconnected", qrDataUrl: null, lastError: this.lastError };
    }
  }

  async connect(): Promise<void> {
    if (this.status === "connected") return; // já conectado, não reconectar

    if (!EVOLUTION_URL || !EVOLUTION_KEY) {
      this.lastError = "Configure EVOLUTION_API_URL e EVOLUTION_API_KEY no servidor.";
      return;
    }

    this.status = "connecting";
    this.lastError = null;
    this.cachedQr = null;

    try {
      // Check current state
      let instanceExists = false;
      try {
        const stateRes = await evo<any>("GET", `/instance/connectionState/${INSTANCE}`);
        const state = stateRes?.instance?.state ?? stateRes?.state ?? "";
        instanceExists = true;
        console.log(`[WhatsApp] Estado atual: ${state}`);
        if (state === "open") { this.status = "connected"; return; }
        // Logout to clear stale credentials so Evolution API generates a fresh QR
        await evo("DELETE", `/instance/logout/${INSTANCE}`).catch(() => {});
        console.log("[WhatsApp] Logout realizado");
      } catch { /* instance doesn't exist */ }

      // Evolution API v2 webhook payload (camelCase, nested under "webhook")
      const webhookBody = WEBHOOK_URL ? {
        webhook: {
          enabled: true,
          url: WEBHOOK_URL,
          webhookByEvents: false,
          webhookBase64: true,
          events: ["QRCODE_UPDATED", "CONNECTION_UPDATE"],
        },
      } : undefined;

      if (instanceExists && webhookBody) {
        try {
          await evo("POST", `/webhook/set/${INSTANCE}`, webhookBody);
          console.log(`[WhatsApp] Webhook configurado: ${WEBHOOK_URL}`);
        } catch (e: any) {
          console.error(`[WhatsApp] Webhook set falhou: ${e.message}`);
        }
      }

      if (!instanceExists) {
        const createPayload: any = {
          instanceName: INSTANCE,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
          ...(webhookBody ?? {}),
        };
        const createRes = await evo<any>("POST", "/instance/create", createPayload);
        console.log("[WhatsApp] Instância criada, webhook:", WEBHOOK_URL || "não configurado");
        const b64 = extractQrBase64(createRes);
        if (b64) this.cachedQr = b64;
      }

      // Trigger QR generation — QR arrives via webhook; this call also starts the connection
      const qrRes = await evo<any>("GET", `/instance/connect/${INSTANCE}`).catch(() => null);
      if (qrRes) {
        console.log("[WhatsApp] Connect triggered:", JSON.stringify(qrRes).slice(0, 150));
        const b64 = extractQrBase64(qrRes);
        if (b64) this.cachedQr = b64;
      }

      if (!WEBHOOK_URL) {
        console.log("[WhatsApp] BACKEND_URL não configurado — QR via polling HTTP (pode ser lento)");
      }
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error("[WhatsApp] Falha ao conectar:", msg);
      this.lastError = msg;
      this.status = "disconnected";
    }
  }

  async disconnect(): Promise<void> {
    // Try multiple delete endpoints (v1 and v2 Evolution API path formats)
    await evo("DELETE", `/instance/logout/${INSTANCE}`).catch(() => {});
    await evo("DELETE", `/instance/delete/${INSTANCE}`).catch(() => {});
    await evo("DELETE", `/instance/${INSTANCE}`).catch(() => {});
    this.cachedQr = null;
    this.status = "disconnected";
    this.lastError = null;
  }

  async sendMessage(phone: string, message: string): Promise<void> {
    if (this.status !== "connected") return;
    try {
      await evo("POST", `/message/sendText/${INSTANCE}`, {
        number: toNumber(phone),
        text: message,
      });
    } catch (err) {
      console.error(`[WhatsApp] Erro ao enviar para ${phone}:`, err);
    }
  }

  async getGroups(): Promise<WhatsAppGroup[]> {
    if (this.status !== "connected") return [];
    try {
      const groups = await evo<any[]>("GET", `/group/fetchAllGroups/${INSTANCE}?getParticipants=false`);
      return (Array.isArray(groups) ? groups : []).map((g: any) => ({
        id: g.id as string,
        name: (g.subject ?? g.id) as string,
        participants: (g.size ?? g.participants?.length ?? 0) as number,
      }));
    } catch (err) {
      console.error("[WhatsApp] Erro ao buscar grupos:", err);
      return [];
    }
  }

  async sendBroadcast(targets: string[], message: string): Promise<{ sent: number; failed: number }> {
    if (this.status !== "connected") throw new Error("WhatsApp não está conectado.");
    let sent = 0;
    let failed = 0;
    for (const target of targets) {
      try {
        await evo("POST", `/message/sendText/${INSTANCE}`, { number: target, text: message });
        sent++;
        await sleep(800);
      } catch (err) {
        console.error(`[WhatsApp] Erro ao enviar para ${target}:`, err);
        failed++;
      }
    }
    return { sent, failed };
  }

  // ── Notification helpers ──────────────────────────────────────────────────

  async notifyTrainingCancelled(dateKey: string): Promise<void> {
    if (this.status !== "connected") return;
    const athletes = await prisma.athlete.findMany({
      where: { status: "ativo", phone: { not: null } },
      select: { name: true, phone: true },
    });
    const date = fmtDate(dateKey);
    for (const a of athletes) {
      if (!a.phone) continue;
      await this.sendMessage(
        a.phone,
        `⚠️ Olá ${first(a.name)}! O treino de *${date}* foi *CANCELADO*. Fique atento para novidades.`,
      );
      await sleep(800);
    }
  }

  async notifyAthleteApproved(athleteId: string): Promise<void> {
    if (this.status !== "connected") return;
    const athlete = await prisma.athlete.findUnique({
      where: { id: athleteId },
      select: { name: true, phone: true },
    });
    if (!athlete?.phone) return;
    await this.sendMessage(
      athlete.phone,
      `🎉 Parabéns ${first(athlete.name)}! Sua aprovação como atleta do *Projeto Pegasus* está confirmada. Bem-vindo(a) ao time! 🏐`,
    );
  }

  async notifyEvaluationUpdated(athleteId: string): Promise<void> {
    if (this.status !== "connected") return;
    const athlete = await prisma.athlete.findUnique({
      where: { id: athleteId },
      select: { name: true, phone: true },
    });
    if (!athlete?.phone) return;
    await this.sendMessage(
      athlete.phone,
      `📊 Olá ${first(athlete.name)}! Sua avaliação técnica foi atualizada. Acesse o sistema Pegasus para conferir suas notas.`,
    );
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("55") && digits.length >= 12 ? digits : "55" + digits;
}
function first(name: string): string { return name.split(" ")[0]; }
function fmtDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-");
  return `${d}/${m}/${y}`;
}
function sleep(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }

export const whatsAppService = new WhatsAppService();
