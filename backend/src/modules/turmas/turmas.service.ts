import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";

export type TurmaPayload = {
  name?: string;
  daysOfWeek?: string[];
  time?: string;
  location?: string;
  dependency?: string | null;
  color?: string;
  active?: boolean;
  order?: number;
  startDate?: string | null;
};

const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function validate(payload: TurmaPayload, requireCore: boolean) {
  if (requireCore && !payload.name?.trim()) {
    throw new AppError("Nome da turma é obrigatório", 400);
  }
  if (requireCore && !payload.time?.trim()) {
    throw new AppError("Horário da turma é obrigatório", 400);
  }
  if (requireCore && !payload.location?.trim()) {
    throw new AppError("Local da turma é obrigatório", 400);
  }
  if (payload.daysOfWeek) {
    for (const day of payload.daysOfWeek) {
      if (!weekdays.includes(day)) {
        throw new AppError(`Dia da semana inválido: ${day}`, 400);
      }
    }
  }
  if (requireCore && (!payload.daysOfWeek || payload.daysOfWeek.length === 0)) {
    throw new AppError("Selecione ao menos um dia da semana", 400);
  }
}

export const turmasService = {
  async findAll() {
    return prisma.turma.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] });
  },

  /** Usado pelo formulário público de inscrição — sem autenticação. */
  async findPublicActive() {
    return prisma.turma.findMany({
      where: { active: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, name: true, time: true, location: true, dependency: true, daysOfWeek: true },
    });
  },

  async findById(id: string) {
    const turma = await prisma.turma.findUnique({ where: { id } });
    if (!turma) throw new AppError("Turma não encontrada", 404);
    return turma;
  },

  async create(payload: TurmaPayload) {
    validate(payload, true);
    return prisma.turma.create({
      data: {
        name: payload.name!.trim(),
        daysOfWeek: payload.daysOfWeek!,
        time: payload.time!.trim(),
        location: payload.location!.trim(),
        dependency: payload.dependency?.trim() || null,
        color: payload.color || "#0D47A1",
        active: payload.active ?? true,
        order: payload.order ?? 0,
        startDate: payload.startDate || null,
      },
    });
  },

  async update(id: string, payload: TurmaPayload) {
    await this.findById(id);
    validate(payload, false);

    const data: Record<string, unknown> = {};
    if (payload.name !== undefined) data.name = payload.name.trim();
    if (payload.daysOfWeek !== undefined) data.daysOfWeek = payload.daysOfWeek;
    if (payload.time !== undefined) data.time = payload.time.trim();
    if (payload.location !== undefined) data.location = payload.location.trim();
    if (payload.dependency !== undefined) data.dependency = payload.dependency?.trim() || null;
    if (payload.color !== undefined) data.color = payload.color;
    if (payload.active !== undefined) data.active = payload.active;
    if (payload.order !== undefined) data.order = payload.order;
    if (payload.startDate !== undefined) data.startDate = payload.startDate || null;

    return prisma.turma.update({ where: { id }, data });
  },

  async delete(id: string) {
    await this.findById(id);
    const athleteCount = await prisma.athlete.count({ where: { turmaId: id } });
    if (athleteCount > 0) {
      throw new AppError(
        `Não é possível excluir: ${athleteCount} atleta(s) estão nessa turma. Desative em vez de excluir.`,
        400,
      );
    }
    await prisma.turma.delete({ where: { id } });
  },
};
