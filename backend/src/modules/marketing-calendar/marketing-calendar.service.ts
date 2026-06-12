import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";

export type MarketingEventPayload = {
  title: string;
  description?: string | null;
  date: string;
  time?: string | null;
  type?: string;
  athleteId?: string | null;
  createdBy?: string | null;
};

function toDateRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export const marketingCalendarService = {
  async getEventsForMonth(year: number, month: number) {
    const { start, end } = toDateRange(year, month);

    const events = await prisma.marketingEvent.findMany({
      where: { date: { gte: start, lt: end } },
      orderBy: [{ date: "asc" }, { time: "asc" }],
    });

    return events.map((e) => ({
      ...e,
      date: toDateKey(e.date),
      athleteName: null as string | null,
      isReadOnly: false,
    }));
  },

  async createEvent(payload: MarketingEventPayload) {
    if (!payload.title?.trim()) throw new AppError("Título é obrigatório", 400);
    if (!payload.date) throw new AppError("Data é obrigatória", 400);

    return prisma.marketingEvent.create({
      data: {
        title: payload.title.trim(),
        description: payload.description?.trim() || null,
        date: new Date(`${payload.date}T12:00:00.000Z`),
        time: payload.time?.trim() || null,
        type: payload.type || "atividade",
        athleteId: payload.athleteId || null,
        createdBy: payload.createdBy || null,
      },
    });
  },

  async updateEvent(id: string, payload: Partial<MarketingEventPayload>) {
    const existing = await prisma.marketingEvent.findUnique({ where: { id } });
    if (!existing) throw new AppError("Evento não encontrado", 404);

    return prisma.marketingEvent.update({
      where: { id },
      data: {
        ...(payload.title !== undefined && { title: payload.title.trim() }),
        ...(payload.description !== undefined && { description: payload.description?.trim() || null }),
        ...(payload.date !== undefined && { date: new Date(`${payload.date}T12:00:00.000Z`) }),
        ...(payload.time !== undefined && { time: payload.time?.trim() || null }),
        ...(payload.type !== undefined && { type: payload.type }),
      },
    });
  },

  async deleteEvent(id: string) {
    const existing = await prisma.marketingEvent.findUnique({ where: { id } });
    if (!existing) throw new AppError("Evento não encontrado", 404);
    await prisma.marketingEvent.delete({ where: { id } });
  },
};
