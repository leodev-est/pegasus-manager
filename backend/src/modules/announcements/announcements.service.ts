import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";
import { notificationsService } from "../notifications/notifications.service";
import { whatsAppService } from "../whatsapp/whatsapp.service";

const allowedTargets = ["all", "active"] as const;
const allowedChannels = ["whatsapp", "notification", "both"] as const;

type AnnouncementTarget = (typeof allowedTargets)[number];
type AnnouncementChannel = (typeof allowedChannels)[number];

type TemplatePayload = {
  title?: string;
  body?: string;
};

type ScheduledPayload = {
  title?: string;
  body?: string;
  target?: AnnouncementTarget;
  channel?: AnnouncementChannel;
  scheduledAt?: string;
};

function requireText(value: string | undefined, field: string) {
  const text = value?.trim();
  if (!text) throw new AppError(`${field} é obrigatório`, 400);
  return text;
}

async function sendAnnouncement(body: string, target: AnnouncementTarget, channel: AnnouncementChannel) {
  const whereStatus = target === "active" ? { status: "ativo" } : {};

  if (channel === "whatsapp" || channel === "both") {
    const athletes = await prisma.athlete.findMany({
      where: { ...whereStatus, phone: { not: null } },
      select: { phone: true },
    });
    for (const a of athletes) {
      if (!a.phone) continue;
      await whatsAppService.sendMessage(a.phone, body).catch(() => {});
      await new Promise((r) => setTimeout(r, 600));
    }
  }

  if (channel === "notification" || channel === "both") {
    await notificationsService.notifyByRoles(["Atleta", "Diretor", "RH", "Gestao", "Tecnico"], {
      title: "Comunicado",
      message: body.slice(0, 200),
      type: "sistema",
    });
  }
}

export const announcementsService = {
  async listTemplates() {
    return prisma.announcementTemplate.findMany({ orderBy: { updatedAt: "desc" } });
  },

  async createTemplate(payload: TemplatePayload) {
    return prisma.announcementTemplate.create({
      data: {
        title: requireText(payload.title, "Título"),
        body: requireText(payload.body, "Corpo"),
      },
    });
  },

  async updateTemplate(id: string, payload: TemplatePayload) {
    const existing = await prisma.announcementTemplate.findUnique({ where: { id } });
    if (!existing) throw new AppError("Template não encontrado", 404);
    return prisma.announcementTemplate.update({
      where: { id },
      data: {
        ...(payload.title !== undefined && { title: requireText(payload.title, "Título") }),
        ...(payload.body !== undefined && { body: requireText(payload.body, "Corpo") }),
      },
    });
  },

  async deleteTemplate(id: string) {
    const existing = await prisma.announcementTemplate.findUnique({ where: { id } });
    if (!existing) throw new AppError("Template não encontrado", 404);
    await prisma.announcementTemplate.delete({ where: { id } });
  },

  async listScheduled() {
    return prisma.scheduledAnnouncement.findMany({ orderBy: { scheduledAt: "desc" } });
  },

  async createScheduled(payload: ScheduledPayload) {
    if (!payload.scheduledAt) throw new AppError("Data de envio é obrigatória", 400);
    const scheduledAt = new Date(payload.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) throw new AppError("Data de envio inválida", 400);

    return prisma.scheduledAnnouncement.create({
      data: {
        title: requireText(payload.title, "Título"),
        body: requireText(payload.body, "Corpo"),
        target: payload.target ?? "active",
        channel: payload.channel ?? "both",
        scheduledAt,
      },
    });
  },

  async cancelScheduled(id: string) {
    const existing = await prisma.scheduledAnnouncement.findUnique({ where: { id } });
    if (!existing) throw new AppError("Comunicado não encontrado", 404);
    if (existing.status !== "pending") throw new AppError("Apenas comunicados pendentes podem ser cancelados", 400);
    return prisma.scheduledAnnouncement.update({
      where: { id },
      data: { status: "cancelled" },
    });
  },

  async processPending() {
    const now = new Date();
    const pending = await prisma.scheduledAnnouncement.findMany({
      where: { status: "pending", scheduledAt: { lte: now } },
    });

    for (const announcement of pending) {
      try {
        await sendAnnouncement(
          announcement.body,
          announcement.target as AnnouncementTarget,
          announcement.channel as AnnouncementChannel,
        );
        await prisma.scheduledAnnouncement.update({
          where: { id: announcement.id },
          data: { status: "sent", sentAt: new Date() },
        });
        console.log(`[Announcements] Sent scheduled: ${announcement.title}`);
      } catch (error) {
        await prisma.scheduledAnnouncement.update({
          where: { id: announcement.id },
          data: { status: "failed", error: error instanceof Error ? error.message : "Erro desconhecido" },
        });
      }
    }
  },
};
