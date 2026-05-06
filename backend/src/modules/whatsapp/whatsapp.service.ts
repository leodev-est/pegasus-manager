import { mkdirSync } from "fs";
import { resolve } from "path";
import QRCode from "qrcode";
import { prisma } from "../../config/prisma";

// Bypass TypeScript's import() → require() transform so we can load
// the ESM-only @whiskeysockets/baileys from a CommonJS project at runtime.
const esmImport = new Function("m", "return import(m)") as (m: string) => Promise<any>;

type ConnectionStatus = "disconnected" | "connecting" | "connected";

export type WhatsAppGroup = {
  id: string;
  name: string;
  participants: number;
};

class WhatsAppService {
  private socket: any = null;
  private status: ConnectionStatus = "disconnected";
  private qrDataUrl: string | null = null;
  private lastError: string | null = null;
  private readonly sessionPath: string;
  private qrTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.sessionPath = resolve(process.env.WHATSAPP_SESSION_PATH ?? "./whatsapp-sessions");
  }

  getStatus(): ConnectionStatus { return this.status; }
  getQrDataUrl(): string | null { return this.qrDataUrl; }
  getLastError(): string | null { return this.lastError; }

  async connect(): Promise<void> {
    if (this.status !== "disconnected") return;
    this.status = "connecting";
    this.qrDataUrl = null;
    this.lastError = null;

    // 30-second timeout: if QR never arrives, surface a clear error
    this.qrTimer = setTimeout(() => {
      if (this.status === "connecting" && !this.qrDataUrl) {
        console.error("[WhatsApp] Timeout: QR não gerado em 30s — verifique conectividade do servidor");
        this.lastError = "QR Code não gerado em 30 segundos. Verifique se o servidor tem acesso à internet / ao WhatsApp.";
        this.status = "disconnected";
        try { this.socket?.end(undefined); } catch {}
        this.socket = null;
        this.qrTimer = null;
      }
    }, 30_000);

    try {
      mkdirSync(this.sessionPath, { recursive: true });

      console.log("[WhatsApp] Importando Baileys…");
      const baileys = await esmImport("@whiskeysockets/baileys");
      const makeWASocket = baileys.default ?? baileys.makeWASocket;

      if (typeof makeWASocket !== "function") {
        throw new Error("Baileys não carregou corretamente (makeWASocket não é uma função)");
      }
      console.log("[WhatsApp] Baileys carregado, inicializando socket…");

      const { useMultiFileAuthState, DisconnectReason } = baileys;
      const { state, saveCreds } = await useMultiFileAuthState(this.sessionPath);

      this.socket = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: silentLogger(),
      });

      this.socket.ev.on("connection.update", async (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          if (this.qrTimer) { clearTimeout(this.qrTimer); this.qrTimer = null; }
          this.qrDataUrl = await QRCode.toDataURL(qr);
          console.log("[WhatsApp] QR gerado — escaneie no painel admin");
        }

        if (connection === "open") {
          if (this.qrTimer) { clearTimeout(this.qrTimer); this.qrTimer = null; }
          this.status = "connected";
          this.qrDataUrl = null;
          this.lastError = null;
          console.log("[WhatsApp] Conectado com sucesso");
        }

        if (connection === "close") {
          if (this.qrTimer) { clearTimeout(this.qrTimer); this.qrTimer = null; }
          const code = lastDisconnect?.error?.output?.statusCode;
          const loggedOut = code === DisconnectReason.loggedOut;
          const prevStatus = this.status;
          this.status = "disconnected";
          this.socket = null;
          console.log(`[WhatsApp] Conexão encerrada (code: ${code})`);
          // If we never got a QR, the connection was rejected before auth — surface the error
          if (prevStatus === "connecting" && !this.qrDataUrl) {
            this.lastError = `Conexão rejeitada pelo WhatsApp (código ${code ?? "desconhecido"}). O IP do servidor pode estar bloqueado. Tente novamente ou use uma VPN/proxy.`;
            console.error(`[WhatsApp] Conexão rejeitada antes do QR (code: ${code})`);
          }
          // Only auto-reconnect if we were already connected (session expired etc.)
          if (!loggedOut && prevStatus === "connected") {
            setTimeout(() => this.connect(), 5_000);
          }
        }
      });

      this.socket.ev.on("creds.update", saveCreds);
    } catch (err: any) {
      if (this.qrTimer) { clearTimeout(this.qrTimer); this.qrTimer = null; }
      const msg = err?.message ?? String(err);
      console.error("[WhatsApp] Falha ao conectar:", msg);
      this.lastError = msg;
      this.status = "disconnected";
    }
  }

  async disconnect(): Promise<void> {
    if (this.qrTimer) { clearTimeout(this.qrTimer); this.qrTimer = null; }
    try { await this.socket?.logout(); } catch {}
    this.socket = null;
    this.status = "disconnected";
    this.qrDataUrl = null;
    this.lastError = null;
  }

  async sendMessage(phone: string, message: string): Promise<void> {
    if (this.status !== "connected" || !this.socket) return;
    try {
      await this.socket.sendMessage(toJid(phone), { text: message });
    } catch (err) {
      console.error(`[WhatsApp] Erro ao enviar para ${phone}:`, err);
    }
  }

  async getGroups(): Promise<WhatsAppGroup[]> {
    if (this.status !== "connected" || !this.socket) return [];
    try {
      const groups = await this.socket.groupFetchAllParticipating();
      return Object.values(groups).map((g: any) => ({
        id: g.id as string,
        name: (g.subject ?? g.id) as string,
        participants: (g.participants?.length ?? 0) as number,
      }));
    } catch (err) {
      console.error("[WhatsApp] Erro ao buscar grupos:", err);
      return [];
    }
  }

  async sendBroadcast(targets: string[], message: string): Promise<{ sent: number; failed: number }> {
    if (this.status !== "connected" || !this.socket) {
      throw new Error("WhatsApp não está conectado.");
    }
    let sent = 0;
    let failed = 0;
    for (const target of targets) {
      try {
        // target can be a JID (group ending in @g.us) or a phone number
        const jid = target.includes("@") ? target : toJid(target);
        await this.socket.sendMessage(jid, { text: message });
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

function toJid(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const normalized = digits.startsWith("55") && digits.length >= 12 ? digits : "55" + digits;
  return normalized + "@s.whatsapp.net";
}

function first(name: string): string { return name.split(" ")[0]; }
function fmtDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-");
  return `${d}/${m}/${y}`;
}
function sleep(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }

function silentLogger() {
  const noop = () => {};
  const logger: any = { level: "silent", trace: noop, debug: noop, info: noop, warn: noop, error: noop, fatal: noop };
  logger.child = () => logger;
  return logger;
}

export const whatsAppService = new WhatsAppService();
