import { mkdirSync } from "fs";
import { resolve } from "path";
import QRCode from "qrcode";
import { prisma } from "../../config/prisma";

// Bypass TypeScript's import() → require() transform so we can load
// the ESM-only @whiskeysockets/baileys from a CommonJS project at runtime.
const esmImport = new Function("m", "return import(m)") as (m: string) => Promise<any>;

type ConnectionStatus = "disconnected" | "connecting" | "connected";

class WhatsAppService {
  private socket: any = null;
  private status: ConnectionStatus = "disconnected";
  private qrDataUrl: string | null = null;
  private lastError: string | null = null;
  private readonly sessionPath: string;

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

    try {
      mkdirSync(this.sessionPath, { recursive: true });

      const baileys = await esmImport("@whiskeysockets/baileys");
      const makeWASocket = baileys.default ?? baileys.makeWASocket;

      if (typeof makeWASocket !== "function") {
        throw new Error("Baileys não carregou corretamente (makeWASocket não é uma função)");
      }

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
          this.qrDataUrl = await QRCode.toDataURL(qr);
          console.log("[WhatsApp] QR gerado — escaneie no painel admin");
        }

        if (connection === "open") {
          this.status = "connected";
          this.qrDataUrl = null;
          this.lastError = null;
          console.log("[WhatsApp] Conectado com sucesso");
        }

        if (connection === "close") {
          const code = lastDisconnect?.error?.output?.statusCode;
          const loggedOut = code === DisconnectReason.loggedOut;
          this.status = "disconnected";
          this.socket = null;
          console.log(`[WhatsApp] Conexão encerrada (code: ${code})`);
          if (!loggedOut) setTimeout(() => this.connect(), 5_000);
        }
      });

      this.socket.ev.on("creds.update", saveCreds);
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error("[WhatsApp] Falha ao conectar:", msg);
      this.lastError = msg;
      this.status = "disconnected";
    }
  }

  async disconnect(): Promise<void> {
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
