import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";

const allowedStatuses = ["planejamento", "confirmado", "realizado"] as const;

export type EventChecklistItem = {
  id: string;
  text: string;
  done: boolean;
};

export type EventPayload = {
  name?: string;
  date?: string;
  location?: string | null;
  budget?: number | null;
  vendors?: string | null;
  checklist?: EventChecklistItem[];
  status?: string;
  createdBy?: string | null;
};

function validateStatus(status?: string) {
  if (status && !allowedStatuses.includes(status as (typeof allowedStatuses)[number])) {
    throw new AppError(`Status deve ser um de: ${allowedStatuses.join(", ")}`, 400);
  }
}

function normalizeChecklist(value?: EventChecklistItem[]) {
  if (!value) return undefined;
  if (!Array.isArray(value)) throw new AppError("Checklist deve ser uma lista", 400);
  return value as unknown as Prisma.InputJsonValue;
}

export const eventsService = {
  async findAll() {
    return prisma.event.findMany({ orderBy: { date: "asc" } });
  },

  async findById(id: string) {
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) throw new AppError("Evento não encontrado", 404);
    return event;
  },

  async create(payload: EventPayload) {
    if (!payload.name?.trim()) throw new AppError("Nome do evento é obrigatório", 400);
    if (!payload.date) throw new AppError("Data do evento é obrigatória", 400);
    validateStatus(payload.status);

    return prisma.event.create({
      data: {
        name: payload.name.trim(),
        date: new Date(`${payload.date}T12:00:00.000Z`),
        location: payload.location?.trim() || null,
        budget: payload.budget ?? null,
        vendors: payload.vendors?.trim() || null,
        checklist: normalizeChecklist(payload.checklist) ?? [],
        status: payload.status || "planejamento",
        createdBy: payload.createdBy || null,
      },
    });
  },

  async update(id: string, payload: EventPayload) {
    await this.findById(id);
    validateStatus(payload.status);

    const data: Prisma.EventUncheckedUpdateInput = {};
    if (payload.name !== undefined) {
      if (!payload.name.trim()) throw new AppError("Nome do evento é obrigatório", 400);
      data.name = payload.name.trim();
    }
    if (payload.date !== undefined) data.date = new Date(`${payload.date}T12:00:00.000Z`);
    if (payload.location !== undefined) data.location = payload.location?.trim() || null;
    if (payload.budget !== undefined) data.budget = payload.budget;
    if (payload.vendors !== undefined) data.vendors = payload.vendors?.trim() || null;
    if (payload.checklist !== undefined) data.checklist = normalizeChecklist(payload.checklist);
    if (payload.status !== undefined) data.status = payload.status;

    return prisma.event.update({ where: { id }, data });
  },

  async delete(id: string) {
    await this.findById(id);
    await prisma.event.delete({ where: { id } });
  },
};
