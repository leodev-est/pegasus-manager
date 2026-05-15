import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";
import { pushService } from "../push/push.service";

const notificationTypes = ["treino", "financeiro", "frequencia", "avaliacao", "sistema"] as const;

type NotificationType = (typeof notificationTypes)[number];

type NotificationPayload = {
  message?: string;
  title?: string;
  type?: string;
  userId?: string;
};

function validateType(type?: string): asserts type is NotificationType {
  if (!type || !notificationTypes.includes(type as NotificationType)) {
    throw new AppError("Tipo de notificação inválido", 400);
  }
}

function requireText(value: string | undefined, field: string) {
  const text = value?.trim();
  if (!text) {
    throw new AppError(`${field} é obrigatório`, 400);
  }
  return text;
}

export const notificationsService = {
  async findMine(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  },

  async markAsRead(userId: string, id: string) {
    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new AppError("Notificação não encontrada", 404);
    }

    return prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  },

  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    return this.findMine(userId);
  },

  async create(payload: NotificationPayload) {
    validateType(payload.type);

    if (!payload.userId) {
      throw new AppError("Usuário destinatário é obrigatório", 400);
    }

    const notification = await prisma.notification.create({
      data: {
        message: requireText(payload.message, "Mensagem"),
        title: requireText(payload.title, "Título"),
        type: payload.type,
        userId: payload.userId,
      },
    });

    pushService
      .sendToUser(payload.userId, { title: notification.title, body: notification.message })
      .catch(() => {});

    return notification;
  },

  async createForUser(userId: string | null | undefined, payload: Omit<NotificationPayload, "userId">) {
    if (!userId) return null;

    return this.create({
      ...payload,
      userId,
    });
  },

  async notifyByRoles(roleNames: string[], payload: Omit<NotificationPayload, "userId">) {
    validateType(payload.type);
    const users = await prisma.user.findMany({
      where: {
        active: true,
        roles: { some: { role: { name: { in: roleNames } } } },
      },
      select: { id: true },
    });
    await Promise.all(
      users.map((u) => this.create({ ...payload, userId: u.id }).catch(() => null)),
    );
  },

  async createOnceTodayForUser(userId: string | null | undefined, payload: Omit<NotificationPayload, "userId">) {
    if (!userId) return null;
    validateType(payload.type);

    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    const existing = await prisma.notification.findFirst({
      where: {
        createdAt: {
          gte: start,
          lt: end,
        },
        title: payload.title,
        type: payload.type,
        userId,
      },
    });

    if (existing) return existing;

    return this.create({
      ...payload,
      userId,
    });
  },
};
