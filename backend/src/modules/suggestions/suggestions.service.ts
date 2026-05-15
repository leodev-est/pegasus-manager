import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";

type CreatePayload = {
  message: string;
  anonymous?: boolean;
  authorId?: string;
  authorName?: string;
};

type UpdatePayload = {
  status?: string;
  response?: string;
};

export const suggestionsService = {
  async create(payload: CreatePayload) {
    if (!payload.message?.trim()) {
      throw new AppError("Mensagem é obrigatória", 400);
    }

    return prisma.suggestion.create({
      data: {
        message: payload.message.trim(),
        anonymous: payload.anonymous ?? false,
        authorId: payload.anonymous ? null : (payload.authorId ?? null),
        authorName: payload.anonymous ? null : (payload.authorName ?? null),
        status: "pendente",
      },
    });
  },

  async findAll(status?: string) {
    return prisma.suggestion.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
    });
  },

  async update(id: string, payload: UpdatePayload) {
    const existing = await prisma.suggestion.findUnique({ where: { id } });
    if (!existing) throw new AppError("Sugestão não encontrada", 404);

    return prisma.suggestion.update({
      where: { id },
      data: {
        ...(payload.status !== undefined && { status: payload.status }),
        ...(payload.response !== undefined && { response: payload.response }),
      },
    });
  },
};
