import { prisma } from "../../config/prisma";

const raw = (process.env.EVOLUTION_API_URL ?? "").replace(/\/$/, "");
const EVOLUTION_URL = raw && !raw.startsWith("http") ? `https://${raw}` : raw;
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY ?? "";
const INSTANCE = process.env.EVOLUTION_INSTANCE_NAME ?? "pegasus";

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

class WhatsAppService {
  private status: ConnectionStatus = "disconnected";
  private lastError: string | null = null;

  getStatus(): ConnectionStatus { return this.status; }
  getLastError(): string | null { return this.lastError; }

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

  /**
   * Live status used by the status endpoint.
   * When connecting, also fetches the current QR from Evolution API so the
   * frontend can display it without storing it in memory on this side.
   */
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
        return { status: "connected", qrDataUrl: null, lastError: null };
      }

      // Still waiting for QR scan — fetch QR from Evolution API
      let qrDataUrl: string | null = null;
      try {
        const qrRes = await evo<any>("GET", `/instance/connect/${INSTANCE}`);
        const b64 = qrRes?.base64 ?? qrRes?.qrcode?.base64;
        if (b64) {
          qrDataUrl = b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`;
        }
      } catch { /* QR not ready yet */ }

      return { status: "connecting", qrDataUrl, lastError: null };
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error("[WhatsApp] Erro ao consultar Evolution API:", msg);
      this.status = "disconnected";
      this.lastError = `Erro ao contatar Evolution API: ${msg}`;
      return { status: "disconnected", qrDataUrl: null, lastError: this.lastError };
    }
  }

  async connect(): Promise<void> {
    if (this.status !== "disconnected") return;

    if (!EVOLUTION_URL || !EVOLUTION_KEY) {
      this.lastError = "Configure EVOLUTION_API_URL e EVOLUTION_API_KEY no servidor.";
      return;
    }

    this.status = "connecting";
    this.lastError = null;

    try {
      // Delete any existing instance to start fresh
      await evo("DELETE", `/instance/delete/${INSTANCE}`).catch(() => {});
      await evo("POST", "/instance/create", {
        instanceName: INSTANCE,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
      });
      console.log("[WhatsApp] Instância criada no Evolution API, aguardando QR…");
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error("[WhatsApp] Falha ao criar instância:", msg);
      this.lastError = msg;
      this.status = "disconnected";
    }
  }

  async disconnect(): Promise<void> {
    try { await evo("DELETE", `/instance/logout/${INSTANCE}`); } catch {}
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
