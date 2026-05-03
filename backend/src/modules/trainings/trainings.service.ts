import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";
import { isBlockedTrainingDate } from "../../utils/trainingDates";

type TrainingFilters = {
  category?: string;
  month?: string;
  search?: string;
};

type TrainingPayload = {
  date?: string;
  title?: string;
  category?: string | null;
  objective?: string | null;
  warmup?: string | null;
  fundamentals?: string | null;
  mainPart?: string | null;
  reducedGame?: string | null;
  finalPart?: string | null;
  notes?: string | null;
  createdBy?: string;
};

function normalizeOptional(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseDate(value: string | undefined, required: boolean) {
  if (!value) {
    if (required) throw new AppError("Data do treino é obrigatória", 400);
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new AppError("Data do treino inválida", 400);
  }

  if (isBlockedTrainingDate(date)) {
    throw new AppError("Esta data está bloqueada para treinos oficiais Pegasus.", 400);
  }

  return date;
}

function parseMonth(month?: string) {
  if (!month) return undefined;

  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new AppError("Mês deve estar no formato YYYY-MM", 400);
  }

  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);

  return { start, end };
}

function buildWhere(filters: TrainingFilters) {
  const where: Prisma.TrainingWhereInput = {};
  const monthRange = parseMonth(filters.month);

  if (filters.category) {
    where.category = filters.category;
  }

  if (monthRange) {
    where.date = {
      gte: monthRange.start,
      lt: monthRange.end,
    };
  }

  if (filters.search?.trim()) {
    const search = filters.search.trim();
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { objective: { contains: search, mode: "insensitive" } },
      { fundamentals: { contains: search, mode: "insensitive" } },
      { mainPart: { contains: search, mode: "insensitive" } },
      { reducedGame: { contains: search, mode: "insensitive" } },
      { notes: { contains: search, mode: "insensitive" } },
    ];
  }

  return where;
}

function buildData(payload: TrainingPayload, requireBaseFields: boolean) {
  const data: Prisma.TrainingUncheckedCreateInput | Prisma.TrainingUncheckedUpdateInput = {};

  if (requireBaseFields && !payload.title?.trim()) {
    throw new AppError("Título do treino é obrigatório", 400);
  }

  if (requireBaseFields && !payload.createdBy?.trim()) {
    throw new AppError("Criado por é obrigatório", 400);
  }

  const date = parseDate(payload.date, requireBaseFields);
  if (date !== undefined) data.date = date;

  if (payload.title !== undefined) {
    const title = payload.title.trim();

    if (!title) {
      throw new AppError("Título do treino é obrigatório", 400);
    }

    data.title = title;
  }

  if (payload.createdBy !== undefined) {
    const createdBy = payload.createdBy.trim();

    if (!createdBy) {
      throw new AppError("Criado por é obrigatório", 400);
    }

    data.createdBy = createdBy;
  }

  if (payload.category !== undefined) data.category = normalizeOptional(payload.category);
  if (payload.objective !== undefined) data.objective = normalizeOptional(payload.objective);
  if (payload.warmup !== undefined) data.warmup = normalizeOptional(payload.warmup);
  if (payload.fundamentals !== undefined) {
    data.fundamentals = normalizeOptional(payload.fundamentals);
  }
  if (payload.mainPart !== undefined) data.mainPart = normalizeOptional(payload.mainPart);
  if (payload.reducedGame !== undefined) data.reducedGame = normalizeOptional(payload.reducedGame);
  if (payload.finalPart !== undefined) data.finalPart = normalizeOptional(payload.finalPart);
  if (payload.notes !== undefined) data.notes = normalizeOptional(payload.notes);

  return data;
}

export const trainingsService = {
  async findAll(filters: TrainingFilters) {
    return prisma.training.findMany({
      where: buildWhere(filters),
      orderBy: { date: "asc" },
    });
  },

  async findById(id: string) {
    const training = await prisma.training.findUnique({
      where: { id },
    });

    if (!training) {
      throw new AppError("Treino não encontrado", 404);
    }

    return training;
  },

  async create(payload: TrainingPayload) {
    const data = buildData(payload, true) as Prisma.TrainingUncheckedCreateInput;

    return prisma.training.create({
      data,
    });
  },

  async update(id: string, payload: TrainingPayload) {
    await this.findById(id);
    const data = buildData(payload, false) as Prisma.TrainingUncheckedUpdateInput;

    return prisma.training.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    await this.findById(id);
    await prisma.training.delete({
      where: { id },
    });
  },
};

