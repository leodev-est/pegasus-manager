import nodemailer from "nodemailer";
import { prisma } from "../../config/prisma";

async function getEmailConfig() {
  return prisma.trainingSetting.findUnique({ where: { id: "singleton" } });
}

function makeTransporter(config: {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
}) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.password },
  });
}

export const emailService = {
  async isEnabled(): Promise<boolean> {
    const cfg = await getEmailConfig();
    return Boolean(cfg?.emailEnabled && cfg.emailHost && cfg.emailUser && cfg.emailPassword && cfg.emailFrom);
  },

  async isFallbackEnabled(): Promise<boolean> {
    const cfg = await getEmailConfig();
    return Boolean(cfg?.emailFallbackEnabled && cfg.emailEnabled && cfg.emailHost && cfg.emailUser && cfg.emailPassword && cfg.emailFrom);
  },

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    const cfg = await getEmailConfig();
    if (!cfg?.emailEnabled) throw new Error("Email não está habilitado nas configurações.");
    if (!cfg.emailHost || !cfg.emailUser || !cfg.emailPassword || !cfg.emailFrom) {
      throw new Error("Configuração SMTP incompleta.");
    }

    const transporter = makeTransporter({
      host: cfg.emailHost,
      port: cfg.emailPort ?? 587,
      secure: cfg.emailSecure,
      user: cfg.emailUser,
      password: cfg.emailPassword,
    });

    await transporter.sendMail({
      from: `"${cfg.emailFromName}" <${cfg.emailFrom}>`,
      to,
      subject,
      html,
    });
  },

  async sendFallback(to: string | null | undefined, subject: string, text: string): Promise<boolean> {
    if (!to) return false;
    const enabled = await this.isFallbackEnabled();
    if (!enabled) return false;

    try {
      const html = `<p>${text.replace(/\n/g, "<br>")}</p>`;
      await this.sendEmail(to, subject, html);
      return true;
    } catch {
      return false;
    }
  },

  async testConnection(): Promise<{ ok: boolean; error?: string }> {
    try {
      const cfg = await getEmailConfig();
      if (!cfg?.emailHost || !cfg.emailUser || !cfg.emailPassword) {
        return { ok: false, error: "Configuração SMTP incompleta." };
      }
      const transporter = makeTransporter({
        host: cfg.emailHost,
        port: cfg.emailPort ?? 587,
        secure: cfg.emailSecure,
        user: cfg.emailUser,
        password: cfg.emailPassword,
      });
      await transporter.verify();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Erro de conexão SMTP." };
    }
  },
};
