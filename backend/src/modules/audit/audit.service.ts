import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

type LogPayload = {
  userId?: string | null;
  userName?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  meta?: Record<string, unknown>;
};

export const auditService = {
  async log(payload: LogPayload) {
    try {
      await prisma.auditLog.create({
        data: {
          userId: payload.userId ?? null,
          userName: payload.userName ?? null,
          action: payload.action,
          entity: payload.entity,
          entityId: payload.entityId ?? null,
          meta: (payload.meta ?? {}) as Prisma.InputJsonValue,
        },
      });
    } catch {
      // Never let audit logging break the main flow
    }
  },

  async list(filters?: { entity?: string; userId?: string; limit?: number }) {
    return prisma.auditLog.findMany({
      where: {
        ...(filters?.entity ? { entity: filters.entity } : {}),
        ...(filters?.userId ? { userId: filters.userId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: filters?.limit ?? 200,
    });
  },
};
