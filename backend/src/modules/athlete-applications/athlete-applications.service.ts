import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";
import { getMonthlyPaymentStatusForAthlete } from "../athletes/monthly-exemption";

const allowedStatuses = ["pendente", "em_analise", "aprovado", "recusado"] as const;

type ApplicationStatus = (typeof allowedStatuses)[number];

type ApplicationFilters = {
  search?: string;
  status?: string;
  position?: string;
};

export type AthleteApplicationPayload = {
  name?: string;
  email?: string | null;
  phone?: string | null;
  category?: string | null;
  position?: string | null;
  contribution?: string | null;
  source?: string | null;
  status?: ApplicationStatus;
  notes?: string | null;
};

function normalizeOptional(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function validateStatus(status?: string) {
  if (status && !allowedStatuses.includes(status as ApplicationStatus)) {
    throw new AppError("Status deve ser pendente, em análise, aprovado ou recusado", 400);
  }
}

function buildWhere(filters: ApplicationFilters) {
  const where: Prisma.AthleteApplicationWhereInput = {};

  if (filters.search) {
    const search = filters.search.trim();

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { contribution: { contains: search, mode: "insensitive" } },
      ];
    }
  }

  if (filters.status) {
    validateStatus(filters.status);
    where.status = filters.status;
  }

  if (filters.position) {
    where.position = filters.position;
  }

  return where;
}

function buildData(payload: AthleteApplicationPayload, requireName: boolean) {
  const data:
    | Prisma.AthleteApplicationUncheckedCreateInput
    | Prisma.AthleteApplicationUncheckedUpdateInput = {};

  if (requireName && !payload.name?.trim()) {
    throw new AppError("Nome da inscrição é obrigatório", 400);
  }

  if (payload.name !== undefined) {
    const name = payload.name.trim();

    if (!name) {
      throw new AppError("Nome da inscrição é obrigatório", 400);
    }

    data.name = name;
  }

  validateStatus(payload.status);

  if (payload.email !== undefined) data.email = normalizeOptional(payload.email);
  if (payload.phone !== undefined) data.phone = normalizeOptional(payload.phone);
  if (payload.category !== undefined) data.category = normalizeOptional(payload.category);
  if (payload.position !== undefined) data.position = normalizeOptional(payload.position);
  if (payload.contribution !== undefined) {
    data.contribution = normalizeOptional(payload.contribution);
  }
  if (payload.source !== undefined) data.source = normalizeOptional(payload.source) ?? "site";
  if (payload.status !== undefined) data.status = payload.status;
  if (payload.notes !== undefined) data.notes = normalizeOptional(payload.notes);

  return data;
}

export const athleteApplicationsService = {
  async findAll(filters: ApplicationFilters) {
    return prisma.athleteApplication.findMany({
      where: buildWhere(filters),
      orderBy: { createdAt: "desc" },
    });
  },

  async findById(id: string) {
    const application = await prisma.athleteApplication.findUnique({
      where: { id },
    });

    if (!application) {
      throw new AppError("Inscrição não encontrada", 404);
    }

    return application;
  },

  async create(payload: AthleteApplicationPayload) {
    const data = buildData(payload, true) as Prisma.AthleteApplicationUncheckedCreateInput;

    return prisma.athleteApplication.create({
      data,
    });
  },

  async update(id: string, payload: AthleteApplicationPayload) {
    await this.findById(id);
    const data = buildData(payload, false) as Prisma.AthleteApplicationUncheckedUpdateInput;

    return prisma.athleteApplication.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    await this.findById(id);

    await prisma.athleteApplication.delete({
      where: { id },
    });
  },

  async approve(id: string) {
    const application = await this.findById(id);

    if (application.status === "aprovado") {
      throw new AppError("Esta inscrição já foi aprovada", 400);
    }

    return prisma.$transaction(async (transaction) => {
      const athlete = await transaction.athlete.create({
        data: {
          name: application.name,
          email: application.email,
          phone: application.phone,
          category: application.category,
          position: application.position,
          notes: application.contribution
            ? `${application.contribution}${application.notes ? `\n\n${application.notes}` : ""}`
            : application.notes,
          status: "teste",
          monthlyPaymentStatus: getMonthlyPaymentStatusForAthlete(application.name),
        },
      });

      const updatedApplication = await transaction.athleteApplication.update({
        where: { id },
        data: { status: "aprovado" },
      });

      return {
        application: updatedApplication,
        athlete,
      };
    });
  },
};


