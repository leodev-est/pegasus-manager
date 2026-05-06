import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";
import { syncActiveAthleteUser } from "./athlete-user-sync";
import { getMonthlyPaymentStatusForAthlete } from "./monthly-exemption";
import { whatsAppService } from "../whatsapp/whatsapp.service";

const allowedStatuses = ["ativo", "teste", "inativo"] as const;
const allowedPaymentStatuses = ["pago", "pendente", "atrasado", "isento"] as const;
const includeUser = {
  user: {
    select: {
      username: true,
    },
  },
};

type AthleteStatus = (typeof allowedStatuses)[number];
type MonthlyPaymentStatus = (typeof allowedPaymentStatuses)[number];

type AthleteFilters = {
  search?: string;
  status?: string;
  category?: string;
  monthlyPaymentStatus?: string;
};

type AthletePayload = {
  name?: string;
  email?: string | null;
  phone?: string | null;
  category?: string | null;
  position?: string | null;
  status?: AthleteStatus;
  monthlyPaymentStatus?: MonthlyPaymentStatus;
  notes?: string | null;
};

function normalizeOptional(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function validateStatus(status?: string) {
  if (status && !allowedStatuses.includes(status as AthleteStatus)) {
    throw new AppError("Status deve ser ativo, teste ou inativo", 400);
  }
}

function validateMonthlyPaymentStatus(monthlyPaymentStatus?: string) {
  if (
    monthlyPaymentStatus &&
    !allowedPaymentStatuses.includes(monthlyPaymentStatus as MonthlyPaymentStatus)
  ) {
    throw new AppError("Mensalidade deve ser paga, pendente, atrasado ou isento", 400);
  }
}

function buildWhere(filters: AthleteFilters) {
  const where: Prisma.AthleteWhereInput = {};

  if (filters.search) {
    const search = filters.search.trim();

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }
  }

  if (filters.status) {
    validateStatus(filters.status);
    where.status = filters.status;
  }

  if (filters.category) {
    where.category = filters.category;
  }

  if (filters.monthlyPaymentStatus) {
    validateMonthlyPaymentStatus(filters.monthlyPaymentStatus);
    where.monthlyPaymentStatus = filters.monthlyPaymentStatus;
  }

  return where;
}

function buildData(payload: AthletePayload, requireName: boolean) {
  const data: Prisma.AthleteUncheckedCreateInput | Prisma.AthleteUncheckedUpdateInput = {};

  if (requireName && !payload.name?.trim()) {
    throw new AppError("Nome do atleta é obrigatório", 400);
  }

  if (payload.name !== undefined) {
    const name = payload.name.trim();

    if (!name) {
      throw new AppError("Nome do atleta é obrigatório", 400);
    }

    data.name = name;
  }

  validateStatus(payload.status);
  validateMonthlyPaymentStatus(payload.monthlyPaymentStatus);

  if (payload.email !== undefined) data.email = normalizeOptional(payload.email);
  if (payload.phone !== undefined) data.phone = normalizeOptional(payload.phone);
  if (payload.category !== undefined) data.category = normalizeOptional(payload.category);
  if (payload.position !== undefined) data.position = normalizeOptional(payload.position);
  if (payload.status !== undefined) data.status = payload.status;
  if (payload.status === "ativo") data.activatedAt = new Date();
  if (payload.status && payload.status !== "ativo") data.activatedAt = null;
  if (payload.monthlyPaymentStatus !== undefined) {
    data.monthlyPaymentStatus = payload.monthlyPaymentStatus;
  }
  if (payload.notes !== undefined) data.notes = normalizeOptional(payload.notes);

  if (typeof data.name === "string") {
    data.monthlyPaymentStatus = getMonthlyPaymentStatusForAthlete(
      data.name,
      typeof data.monthlyPaymentStatus === "string" ? data.monthlyPaymentStatus : "pendente",
    );
  }

  return data;
}

export const athletesService = {
  async findAll(filters: AthleteFilters) {
    return prisma.athlete.findMany({
      where: buildWhere(filters),
      orderBy: { name: "asc" },
    });
  },

  async findById(id: string) {
    const athlete = await prisma.athlete.findUnique({
      where: { id },
    });

    if (!athlete) {
      throw new AppError("Atleta não encontrado", 404);
    }

    return athlete;
  },

  async create(payload: AthletePayload) {
    const data = buildData(payload, true) as Prisma.AthleteUncheckedCreateInput;

    const athlete = await prisma.athlete.create({
      data,
    });

    if (athlete.status === "ativo") {
      await syncActiveAthleteUser(athlete);
    }

    return prisma.athlete.findUniqueOrThrow({
      where: { id: athlete.id },
      include: includeUser,
    });
  },

  async update(id: string, payload: AthletePayload) {
    const currentAthlete = await this.findById(id);
    const wasInTest = currentAthlete.status === "teste";

    const data = buildData(payload, false) as Prisma.AthleteUncheckedUpdateInput;
    const athleteName = typeof data.name === "string" ? data.name : currentAthlete.name;
    const athleteStatus = typeof data.status === "string" ? data.status : currentAthlete.status;

    if (athleteStatus === "ativo" && currentAthlete.status === "ativo") {
      delete data.activatedAt;
    }

    data.monthlyPaymentStatus = getMonthlyPaymentStatusForAthlete(
      athleteName,
      typeof data.monthlyPaymentStatus === "string"
        ? data.monthlyPaymentStatus
        : currentAthlete.monthlyPaymentStatus,
    );

    const athlete = await prisma.athlete.update({
      where: { id },
      data,
    });

    if (athlete.status === "ativo") {
      await syncActiveAthleteUser(athlete);
      if (wasInTest) {
        whatsAppService.notifyAthleteApproved(athlete.id).catch(() => {});
      }
    }
    return prisma.athlete.findUniqueOrThrow({
      where: { id: athlete.id },
      include: includeUser,
    });
  },

  async softDelete(id: string) {
    await this.findById(id);

    return prisma.athlete.update({
      where: { id },
      data: {
        status: "inativo",
      },
    });
  },
};


