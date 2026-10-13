import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";
import { notifyUsersByName } from "../marketing/marketing-notify";
import { normalizeLinks, normalizeNameList } from "../marketing/marketing.shared";

const allowedStatuses = ["planejamento", "confirmado", "realizado"] as const;

export type EventChecklistItem = {
  id: string;
  text: string;
  done: boolean;
  /** Quem cuida desse item (nome de usuário de marketing). */
  assignee?: string | null;
  /** Prazo do item (YYYY-MM-DD). */
  dueDate?: string | null;
};

export type EventPayload = {
  name?: string;
  date?: string;
  location?: string | null;
  budget?: number | null;
  vendors?: string | null;
  checklist?: EventChecklistItem[];
  assignedTo?: string[];
  links?: unknown;
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

async function notifyEventAssignees(name: string, date: Date, assignees: string[], actorId?: string) {
  if (assignees.length === 0) return;
  const when = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(date);
  await notifyUsersByName(assignees, { title: "Você cuida de um evento", message: `"${name}" · ${when}` }, actorId);
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

  async create(payload: EventPayload, actorId?: string) {
    if (!payload.name?.trim()) throw new AppError("Nome do evento é obrigatório", 400);
    if (!payload.date) throw new AppError("Data do evento é obrigatória", 400);
    validateStatus(payload.status);

    const event = await prisma.event.create({
      data: {
        name: payload.name.trim(),
        date: new Date(`${payload.date}T12:00:00.000Z`),
        location: payload.location?.trim() || null,
        budget: payload.budget ?? null,
        vendors: payload.vendors?.trim() || null,
        checklist: normalizeChecklist(payload.checklist) ?? [],
        assignedTo: normalizeNameList(payload.assignedTo),
        links: (normalizeLinks(payload.links) ?? []) as unknown as Prisma.InputJsonValue,
        status: payload.status || "planejamento",
        createdBy: payload.createdBy || null,
      },
    });

    notifyEventAssignees(event.name, event.date, normalizeNameList(payload.assignedTo), actorId).catch(() => {});
    return event;
  },

  async update(id: string, payload: EventPayload, actorId?: string) {
    const current = await this.findById(id);
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

    let added: string[] = [];
    if (payload.assignedTo !== undefined) {
      const next = normalizeNameList(payload.assignedTo);
      const before = new Set(current.assignedTo.map((n) => n.toLowerCase()));
      added = next.filter((name) => !before.has(name.toLowerCase()));
      data.assignedTo = next;
    }
    const links = normalizeLinks(payload.links);
    if (links !== undefined) data.links = links as unknown as Prisma.InputJsonValue;

    const event = await prisma.event.update({ where: { id }, data });
    notifyEventAssignees(event.name, event.date, added, actorId).catch(() => {});
    return event;
  },

  async delete(id: string) {
    await this.findById(id);
    await prisma.event.delete({ where: { id } });
  },
};
