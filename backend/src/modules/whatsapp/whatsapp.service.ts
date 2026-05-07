import { prisma } from "../../config/prisma";

const raw = (process.env.EVOLUTION_API_URL ?? "").replace(/\/$/, "");
const EVOLUTION_URL = raw && !raw.startsWith("http") ? `https://${raw}` : raw;
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY ?? "";
const INSTANCE_PREFIX = process.env.EVOLUTION_INSTANCE_NAME ?? "pegasus";

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
    res?.data?.qrcode?.base64 ??
    res?.qrcode ??
    res?.instance?.qrcode;
  if (!b64 || typeof b64 !== "string") return null;
  return b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`;
}

/** Generate a short unique suffix — timestamp + random component so concurrent calls never collide. */
function uniqueSuffix(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

class WhatsAppService {
  private status: ConnectionStatus = "disconnected";
  private lastError: string | null = null;
  private cachedQr: string | null = null;
  private connectStartedAt = 0;
  // Tracks the currently active instance name (changes on each connect())
  private activeInstance: string = INSTANCE_PREFIX;

  getStatus(): ConnectionStatus { return this.status; }
  getLastError(): string | null { return this.lastError; }

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
    // Ignore disconnect events for 20s after connect() starts — the intentional
    // logout fires a 'close' event that would otherwise reset status mid-connect.
    if (Date.now() - this.connectStartedAt < 20_000) {
      console.log("[WhatsApp] Ignorando disconnect durante connect ativo");
      return;
    }
    this.status = "disconnected";
    this.cachedQr = null;
  }

  /** Called once on startup to restore a persisted session. */
  async init(): Promise<void> {
    if (!EVOLUTION_URL || !EVOLUTION_KEY) {
      console.log("[WhatsApp] Evolution API não configurada — defina EVOLUTION_API_URL e EVOLUTION_API_KEY");
      return;
    }
    // Try to find any open pegasus-* instance
    try {
      const instances: any[] = await evo<any[]>("GET", "/instance/fetchInstances").catch(() => []);
      const list = Array.isArray(instances) ? instances : [];
      for (const item of list) {
        const name: string = item?.instance?.instanceName ?? item?.instanceName ?? "";
        const state: string = item?.instance?.state ?? item?.state ?? "";
        if (name.startsWith(INSTANCE_PREFIX) && state === "open") {
          this.activeInstance = name;
          this.status = "connected";
          console.log(`[WhatsApp] Sessão restaurada: ${name}`);
          return;
        }
      }
    } catch {
      // fetchInstances not available — fall back to direct check
      try {
        const res = await evo<any>("GET", `/instance/connectionState/${this.activeInstance}`);
        const state = res?.instance?.state ?? res?.state;
        if (state === "open") {
          this.status = "connected";
          console.log("[WhatsApp] Sessão restaurada (direct check)");
        }
      } catch { /* instance doesn't exist */ }
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

    const inst = this.activeInstance;
    try {
      const stateRes = await evo<any>("GET", `/instance/connectionState/${inst}`);
      const state = stateRes?.instance?.state ?? stateRes?.state;

      if (state === "open") {
        this.status = "connected";
        this.lastError = null;
        this.cachedQr = null;
        return { status: "connected", qrDataUrl: null, lastError: null };
      }

      if (!this.cachedQr) {
        for (const path of [
          `/instance/qrcode/${inst}`,
          `/instance/qrcode/${inst}?image=false`,
          `/instance/connect/${inst}`,
        ]) {
          try {
            const qrRes = await evo<any>("GET", path);
            const b64 = extractQrBase64(qrRes);
            if (b64) {
              this.cachedQr = b64;
              console.log(`[WhatsApp] QR obtido via ${path}`);
              break;
            }
          } catch { /* endpoint may not exist */ }
        }
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
    if (this.status === "connected") return;

    if (!EVOLUTION_URL || !EVOLUTION_KEY) {
      this.lastError = "Configure EVOLUTION_API_URL e EVOLUTION_API_KEY no servidor.";
      return;
    }

    this.status = "connecting";
    this.lastError = null;
    this.cachedQr = null;
    this.connectStartedAt = Date.now();

    const webhookConfig = WEBHOOK_URL ? {
      enabled: true,
      url: WEBHOOK_URL,
      webhookByEvents: false,
      webhookBase64: true,
      events: ["QRCODE_UPDATED", "CONNECTION_UPDATE", "MESSAGES_UPSERT"],
    } : undefined;

    console.log(`[WhatsApp] WEBHOOK_URL: ${WEBHOOK_URL || "(não configurada)"}`);

    try {
      await this.deleteAllPegasusInstances();

      const newInstance = `${INSTANCE_PREFIX}-${uniqueSuffix()}`;
      this.activeInstance = newInstance;
      console.log(`[WhatsApp] Criando instância fresca: ${newInstance}`);

      const createPayload: any = {
        instanceName: newInstance,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
        ...(webhookConfig ? { webhook: webhookConfig } : {}),
      };
      const createRes = await evo<any>("POST", "/instance/create", createPayload);
      console.log("[WhatsApp] Instância criada:", JSON.stringify(createRes).slice(0, 300));
      const b64create = extractQrBase64(createRes);
      if (b64create) {
        this.cachedQr = b64create;
        console.log("[WhatsApp] QR obtido direto do create");
      }

      // Set webhook explicitly — Evolution API v2 expects the flat structure (no "webhook" wrapper)
      if (webhookConfig) {
        try {
          const whRes = await evo<any>("POST", `/webhook/set/${newInstance}`, webhookConfig);
          console.log("[WhatsApp] Webhook set OK:", JSON.stringify(whRes).slice(0, 200));
        } catch (e: any) {
          console.log("[WhatsApp] Webhook set falhou:", e.message);
        }
      }

      // Trigger QR generation (Baileys needs a moment to initialize — wait 2s first)
      await sleep(2000);
      if (!this.cachedQr) {
        const qrRes = await evo<any>("GET", `/instance/connect/${newInstance}`).catch(() => null);
        if (qrRes) {
          console.log("[WhatsApp] /instance/connect resposta:", JSON.stringify(qrRes).slice(0, 300));
          const b64 = extractQrBase64(qrRes);
          if (b64) {
            this.cachedQr = b64;
            console.log("[WhatsApp] QR obtido via /instance/connect");
          }
        }
      }

      // Background polling: Baileys pode demorar até 15s para gerar o QR.
      // Tenta a cada 3s por até 60s, mesmo que o webhook não chegue.
      void this.pollForQR(newInstance);
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error("[WhatsApp] Falha ao conectar:", msg);
      this.lastError = msg;
      this.status = "disconnected";
    }
  }

  /** Polls Evolution API for QR every 3s for up to 60s. Runs in background. */
  private async pollForQR(instance: string): Promise<void> {
    const paths = [
      `/instance/connect/${instance}`,
      `/instance/qrcode/${instance}?image=true`,
      `/instance/qrcode/${instance}`,
    ];
    for (let attempt = 1; attempt <= 20; attempt++) {
      await sleep(3000);
      if (this.activeInstance !== instance || this.status !== "connecting") return;
      if (this.cachedQr) return; // webhook already delivered it

      for (const path of paths) {
        try {
          const res = await evo<any>("GET", path);
          // Log full response on first two attempts so we can diagnose format issues
          if (attempt <= 2) {
            console.log(`[WhatsApp] Poll ${path} resposta:`, JSON.stringify(res).slice(0, 500));
          }
          const b64 = extractQrBase64(res);
          if (b64) {
            this.cachedQr = b64;
            console.log(`[WhatsApp] QR obtido via polling ${path} (tentativa ${attempt})`);
            return;
          }
        } catch (e: any) {
          if (attempt <= 2) {
            console.log(`[WhatsApp] Poll ${path} erro:`, e.message);
          }
        }
      }
      if (attempt % 5 === 0) {
        console.log(`[WhatsApp] QR poll tentativa ${attempt}/20 — sem QR ainda`);
      }
    }
    console.log("[WhatsApp] QR não obtido após 60s de polling — timeout");
    if (!this.cachedQr && this.status === "connecting") {
      this.lastError = "QR não gerado — tente desconectar e conectar novamente.";
    }
  }

  /** Deletes all Evolution API instances whose name starts with INSTANCE_PREFIX. */
  private async deleteAllPegasusInstances(): Promise<void> {
    const namesToDelete = new Set<string>();
    // Root prefix: "pegasus" regardless of env-var suffix (e.g. "pegasus-new" → "pegasus")
    const rootPrefix = INSTANCE_PREFIX.split("-")[0];

    // List all instances and log them so we know what's alive
    try {
      const instances: any[] = await evo<any[]>("GET", "/instance/fetchInstances");
      const list = Array.isArray(instances) ? instances : [];
      const allNames = list.map((i: any) => i?.instance?.instanceName ?? i?.instanceName ?? "?");
      console.log(`[WhatsApp] Instâncias na Evolution API: ${allNames.join(", ") || "(nenhuma)"}`);
      for (const item of list) {
        const name: string = item?.instance?.instanceName ?? item?.instanceName ?? "";
        // Match any instance that starts with the root prefix (e.g. "pegasus")
        if (name.startsWith(rootPrefix)) namesToDelete.add(name);
      }
    } catch (e: any) {
      console.log("[WhatsApp] fetchInstances falhou:", e.message);
    }

    // Always include tracked instance, configured prefix, and root prefix
    namesToDelete.add(this.activeInstance);
    namesToDelete.add(INSTANCE_PREFIX);
    namesToDelete.add(rootPrefix);
    console.log(`[WhatsApp] Para deletar: ${[...namesToDelete].join(", ")}`);

    for (const name of namesToDelete) {
      // Step 1: logout — clears Baileys session credentials so next create starts fresh
      try {
        const logoutRes = await evo<any>("DELETE", `/instance/logout/${name}`);
        console.log(`[WhatsApp] Logout ${name} OK:`, JSON.stringify(logoutRes).slice(0, 200));
      } catch (e: any) {
        console.log(`[WhatsApp] Logout ${name} falhou:`, e.message);
      }
      await sleep(1500); // give Evolution API time to clear session state

      // Step 2: delete instance — try two known endpoint variants
      let deleted = false;
      for (const path of [`/instance/delete/${name}`, `/instance/${name}`]) {
        try {
          const delRes = await evo<any>("DELETE", path);
          console.log(`[WhatsApp] Delete ${name} via ${path} OK:`, JSON.stringify(delRes).slice(0, 200));
          deleted = true;
          break;
        } catch (e: any) {
          console.log(`[WhatsApp] Delete ${name} via ${path} falhou:`, e.message);
        }
      }
      if (!deleted) console.log(`[WhatsApp] AVISO: não conseguiu deletar ${name}`);
      await sleep(800);
    }

    // Verify — confirm no pegasus instances remain
    await sleep(1500);
    try {
      const remaining: any[] = await evo<any[]>("GET", "/instance/fetchInstances").catch(() => []);
      const alive = (Array.isArray(remaining) ? remaining : [])
        .map((i: any) => i?.instance?.instanceName ?? i?.instanceName ?? "")
        .filter((n: string) => n.startsWith(INSTANCE_PREFIX));
      if (alive.length > 0) {
        console.log(`[WhatsApp] AVISO: ainda vivas após delete: ${alive.join(", ")}`);
      } else {
        console.log("[WhatsApp] Verificação pós-delete: nenhuma instância pegasus ativa");
      }
    } catch { /* ignore */ }
  }

  async disconnect(): Promise<void> {
    await this.deleteAllPegasusInstances();
    this.cachedQr = null;
    this.status = "disconnected";
    this.lastError = null;
    this.activeInstance = INSTANCE_PREFIX;
  }

  async sendMessage(phone: string, message: string): Promise<void> {
    if (this.status !== "connected") return;
    try {
      await evo("POST", `/message/sendText/${this.activeInstance}`, {
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
      const groups = await evo<any[]>("GET", `/group/fetchAllGroups/${this.activeInstance}?getParticipants=false`);
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
        await evo("POST", `/message/sendText/${this.activeInstance}`, { number: target, text: message });
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
