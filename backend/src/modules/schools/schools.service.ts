import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";

const allowedStatuses = [
  "nao_contatada",
  "em_conversa",
  "reuniao_marcada",
  "recusada",
  "parceria_fechada",
] as const;

type SchoolStatus = (typeof allowedStatuses)[number];

type SchoolFilters = {
  search?: string;
  region?: string;
  status?: string;
  responsible?: string;
};

type SchoolPayload = {
  name?: string;
  contact?: string | null;
  phone?: string | null;
  email?: string | null;
  region?: string | null;
  status?: SchoolStatus;
  responsible?: string | null;
  nextAction?: string | null;
  notes?: string | null;
};

function normalizeOptional(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function validateStatus(status?: string) {
  if (status && !allowedStatuses.includes(status as SchoolStatus)) {
    throw new AppError(
      "Status deve ser não contatada, em conversa, reunião marcada, recusada ou parceria fechada",
      400,
    );
  }
}

function buildWhere(filters: SchoolFilters) {
  const where: Prisma.SchoolWhereInput = {};

  if (filters.search?.trim()) {
    const search = filters.search.trim();
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { contact: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  if (filters.region) {
    where.region = filters.region;
  }

  if (filters.status) {
    validateStatus(filters.status);
    where.status = filters.status;
  }

  if (filters.responsible) {
    where.responsible = filters.responsible;
  }

  return where;
}

function buildData(payload: SchoolPayload, requireName: boolean) {
  const data: Prisma.SchoolUncheckedCreateInput | Prisma.SchoolUncheckedUpdateInput = {};

  if (requireName && !payload.name?.trim()) {
    throw new AppError("Nome da escola é obrigatório", 400);
  }

  if (payload.name !== undefined) {
    const name = payload.name.trim();

    if (!name) {
      throw new AppError("Nome da escola é obrigatório", 400);
    }

    data.name = name;
  }

  validateStatus(payload.status);

  if (payload.contact !== undefined) data.contact = normalizeOptional(payload.contact);
  if (payload.phone !== undefined) data.phone = normalizeOptional(payload.phone);
  if (payload.email !== undefined) data.email = normalizeOptional(payload.email);
  if (payload.region !== undefined) data.region = normalizeOptional(payload.region);
  if (payload.status !== undefined) data.status = payload.status;
  if (payload.responsible !== undefined) data.responsible = normalizeOptional(payload.responsible);
  if (payload.nextAction !== undefined) data.nextAction = normalizeOptional(payload.nextAction);
  if (payload.notes !== undefined) data.notes = normalizeOptional(payload.notes);

  return data;
}

export const schoolsService = {
  async findAll(filters: SchoolFilters) {
    return prisma.school.findMany({
      where: buildWhere(filters),
      orderBy: { name: "asc" },
    });
  },

  async findById(id: string) {
    const school = await prisma.school.findUnique({
      where: { id },
    });

    if (!school) {
      throw new AppError("Escola não encontrada", 404);
    }

    return school;
  },

  async create(payload: SchoolPayload) {
    const data = buildData(
      {
        status: "nao_contatada",
        ...payload,
      },
      true,
    ) as Prisma.SchoolUncheckedCreateInput;

    return prisma.school.create({
      data,
    });
  },

  async update(id: string, payload: SchoolPayload) {
    await this.findById(id);
    const data = buildData(payload, false) as Prisma.SchoolUncheckedUpdateInput;

    return prisma.school.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    await this.findById(id);
    await prisma.school.delete({
      where: { id },
    });
  },
};


