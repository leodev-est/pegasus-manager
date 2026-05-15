import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";
import { syncActiveAthleteUser } from "./athlete-user-sync";
import { whatsAppService } from "../whatsapp/whatsapp.service";
import { notificationsService } from "../notifications/notifications.service";

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

const allowedGenders = ["masculino", "feminino"] as const;
type Gender = (typeof allowedGenders)[number];

type AthletePayload = {
  name?: string;
  email?: string | null;
  phone?: string | null;
  category?: string | null;
  position?: string | null;
  gender?: Gender | null;
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
  if (payload.gender !== undefined) {
    if (payload.gender && !allowedGenders.includes(payload.gender as Gender)) {
      throw new AppError("Gênero deve ser masculino ou feminino", 400);
    }
    data.gender = payload.gender ?? null;
  }
  if (payload.status !== undefined) data.status = payload.status;
  if (payload.status === "ativo") data.activatedAt = new Date();
  if (payload.status && payload.status !== "ativo") data.activatedAt = null;
  if (payload.monthlyPaymentStatus !== undefined) {
    data.monthlyPaymentStatus = payload.monthlyPaymentStatus;
  }
  if (payload.notes !== undefined) data.notes = normalizeOptional(payload.notes);

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

    const athlete = await prisma.athlete.update({
      where: { id },
      data,
    });

    if (athlete.status === "ativo") {
      const syncedUser = await syncActiveAthleteUser(athlete);
      if (wasInTest) {
        const username = syncedUser?.username ?? undefined;
        const isNewUser = syncedUser?.mustChangePassword === true;
        whatsAppService.notifyAthleteApproved(athlete.id, username, isNewUser).catch(() => {});

        if (syncedUser) {
          notificationsService
            .createForUser(syncedUser.id, {
              title: "Bem-vindo ao Pegasus! 🏐",
              message: "Sua inscrição foi aprovada. Acesse o sistema para ver seus treinos e informações.",
              type: "sistema",
            })
            .catch(() => {});
        }

        notificationsService
          .notifyByRoles(["RH", "Diretor"], {
            title: "Atleta aprovado",
            message: `${athlete.name} foi aprovado(a) e agora faz parte do elenco ativo.`,
            type: "sistema",
          })
          .catch(() => {});
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

  async updatePaymentStatus(id: string, status: string, changedBy: string, notes?: string) {
    validateMonthlyPaymentStatus(status);
    const athlete = await this.findById(id);

    if (status !== "isento") {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const refMonth = `${year}-${String(month + 1).padStart(2, "0")}`;
      const monthStart = new Date(Date.UTC(year, month, 1));
      const monthEnd = new Date(Date.UTC(year, month + 1, 1));
      const paymentStatus = status as "pago" | "pendente" | "atrasado";
      const paidAt = status === "pago" ? now : null;
      const dueDate = new Date(Date.UTC(year, month, 10));

      const existing = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Payment"
        WHERE "athleteId" = ${id}
          AND (LOWER(category) LIKE '%mensalidade%' OR LOWER(description) LIKE '%mensalidade%')
          AND (
            "referenceMonth" = ${refMonth}
            OR (
              "referenceMonth" IS NULL
              AND (
                ("dueDate" >= ${monthStart} AND "dueDate" < ${monthEnd})
                OR ("createdAt" >= ${monthStart} AND "createdAt" < ${monthEnd})
              )
            )
          )
        LIMIT 1
      `;

      if (existing.length > 0) {
        await prisma.$queryRaw`
          UPDATE "Payment"
          SET status = ${paymentStatus}, "paidAt" = ${paidAt}, "referenceMonth" = ${refMonth}, "updatedAt" = NOW()
          WHERE id = ${existing[0].id}
        `;
      } else {
        const lastAmount = await prisma.$queryRaw<{ amount: number }[]>`
          SELECT amount FROM "Payment"
          WHERE "athleteId" = ${id}
            AND type = 'receita'
            AND (LOWER(category) LIKE '%mensalidade%' OR LOWER(description) LIKE '%mensalidade%')
          ORDER BY "createdAt" DESC
          LIMIT 1
        `;
        const amount = lastAmount.length > 0 ? Number(lastAmount[0].amount) : 0;

        await prisma.$queryRaw`
          INSERT INTO "Payment" (id, "athleteId", description, amount, type, category, status, "dueDate", "referenceMonth", "paidAt", "updatedAt")
          VALUES (
            ${randomUUID()}, ${id}, 'Mensalidade', ${amount}, 'receita', 'Mensalidade',
            ${paymentStatus}, ${dueDate}, ${refMonth}, ${paidAt}, NOW()
          )
        `;
      }
    }

    await prisma.paymentStatusHistory.create({
      data: {
        athleteId: id,
        fromStatus: athlete.monthlyPaymentStatus,
        toStatus: status,
        changedBy,
        notes: notes?.trim() || null,
      },
    });

    return prisma.athlete.update({
      where: { id },
      data: { monthlyPaymentStatus: status as MonthlyPaymentStatus },
      include: includeUser,
    });
  },

  async getPaymentStatusHistory(id: string) {
    await this.findById(id);
    return prisma.paymentStatusHistory.findMany({
      where: { athleteId: id },
      orderBy: { createdAt: "desc" },
    });
  },
};


