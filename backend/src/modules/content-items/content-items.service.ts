import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";

const allowedStatuses = ["referencia", "definido", "gravado", "editado", "postado"] as const;

export type ContentItemPayload = {
  title?: string;
  description?: string | null;
  date?: string;
  status?: string;
  assignedTo?: string[];
};

function validateStatus(status?: string) {
  if (status && !allowedStatuses.includes(status as (typeof allowedStatuses)[number])) {
    throw new AppError(`Status deve ser um de: ${allowedStatuses.join(", ")}`, 400);
  }
}

function normalizeAssignedTo(value?: string[]) {
  if (!value) return [];
  return Array.from(new Set(value.map((name) => name.trim()).filter(Boolean)));
}

export const contentItemsService = {
  /**
   * Itens da semana (entre weekStart e weekEnd), junto com os Eventos do time
   * marcados nessa mesma semana — evento também é conteúdo a registrar, então
   * aparece como marcador de leitura na pauta, sem duplicar a UI de eventos.
   */
  async findForWeek(weekStart: Date, weekEnd: Date) {
    const [items, events] = await Promise.all([
      prisma.contentItem.findMany({
        where: { date: { gte: weekStart, lt: weekEnd } },
        orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      }),
      prisma.event.findMany({
        where: { date: { gte: weekStart, lt: weekEnd } },
        select: { id: true, name: true, date: true, location: true },
        orderBy: { date: "asc" },
      }),
    ]);

    return { items, events };
  },

  async findById(id: string) {
    const item = await prisma.contentItem.findUnique({ where: { id } });
    if (!item) throw new AppError("Item de conteúdo não encontrado", 404);
    return item;
  },

  async create(payload: ContentItemPayload) {
    if (!payload.title?.trim()) throw new AppError("Título é obrigatório", 400);
    if (!payload.date) throw new AppError("Data é obrigatória", 400);
    validateStatus(payload.status);

    return prisma.contentItem.create({
      data: {
        title: payload.title.trim(),
        description: payload.description?.trim() || null,
        date: new Date(`${payload.date}T12:00:00.000Z`),
        status: payload.status || "referencia",
        assignedTo: normalizeAssignedTo(payload.assignedTo),
      },
    });
  },

  async update(id: string, payload: ContentItemPayload) {
    await this.findById(id);
    validateStatus(payload.status);

    const data: Record<string, unknown> = {};
    if (payload.title !== undefined) {
      if (!payload.title.trim()) throw new AppError("Título é obrigatório", 400);
      data.title = payload.title.trim();
    }
    if (payload.description !== undefined) data.description = payload.description?.trim() || null;
    if (payload.date !== undefined) data.date = new Date(`${payload.date}T12:00:00.000Z`);
    if (payload.status !== undefined) data.status = payload.status;
    if (payload.assignedTo !== undefined) data.assignedTo = normalizeAssignedTo(payload.assignedTo);

    return prisma.contentItem.update({ where: { id }, data });
  },

  async delete(id: string) {
    await this.findById(id);
    await prisma.contentItem.delete({ where: { id } });
  },
};
