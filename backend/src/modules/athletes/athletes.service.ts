import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { prisma } from "../../config/prisma";
import { cache } from "../../config/cache";
import { AppError } from "../../middlewares/error.middleware";
import { syncActiveAthleteUser } from "./athlete-user-sync";
import { whatsAppService } from "../whatsapp/whatsapp.service";
import { notificationsService } from "../notifications/notifications.service";

const CACHE_PREFIX = "athletes:";
const CACHE_TTL = 60_000;

const allowedStatuses = ["ativo", "teste", "inativo", "lesao"] as const;
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
    throw new AppError("Status deve ser ativo, teste, inativo ou lesao", 400);
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

function invalidateAthleteCache() {
  cache.delPrefix(CACHE_PREFIX);
}

export const athletesService = {
  async findAll(filters: AthleteFilters) {
    const key = CACHE_PREFIX + JSON.stringify(filters);
    const cached = cache.get<Awaited<ReturnType<typeof prisma.athlete.findMany>>>(key);
    if (cached) return cached;

    const result = await prisma.athlete.findMany({
      where: buildWhere(filters),
      orderBy: { name: "asc" },
    });

    cache.set(key, result, CACHE_TTL);
    return result;
  },

  async findBirthdays() {
    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();

    // Build the next 7 days as month/day pairs (handles month rollover)
    const window: Array<{ month: number; day: number }> = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      window.push({ month: d.getMonth() + 1, day: d.getDate() });
    }

    const athletes = await prisma.athlete.findMany({
      where: {
        birthDate: { not: null },
        status: { in: ["ativo", "teste"] },
      },
      select: { id: true, name: true, birthDate: true, status: true },
      orderBy: { name: "asc" },
    });

    const todayBirthdays = athletes.filter((a) => {
      const d = a.birthDate!;
      return d.getMonth() + 1 === todayMonth && d.getDate() === todayDay;
    });

    const weekBirthdays = athletes.filter((a) => {
      const d = a.birthDate!;
      const m = d.getMonth() + 1;
      const day = d.getDate();
      return window.some((w) => w.month === m && w.day === day) && !(m === todayMonth && day === todayDay);
    });

    return { today: todayBirthdays, week: weekBirthdays };
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

    invalidateAthleteCache();
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

    // Se saindo de lesão com isenção de lesão ativa → reverte para pendente
    const wasInjured = currentAthlete.status === "lesao";
    if (wasInjured && data.status && data.status !== "lesao" && currentAthlete.monthlyPaymentStatus === "isento") {
      data.monthlyPaymentStatus = "pendente";
    }

    const athlete = await prisma.athlete.update({
      where: { id },
      data,
    });

    // Notifica diretores quando atleta vai para lesão
    if (data.status === "lesao" && !wasInjured) {
      notificationsService
        .notifyByRoles(["Diretor"], {
          title: "Atleta com lesão",
          message: `${athlete.name} foi marcado(a) como lesionado(a). Deseja isentar das mensalidades até o retorno?`,
          type: "sistema",
          meta: JSON.stringify({ action: "lesao_isencao", athleteId: athlete.id, athleteName: athlete.name }),
        })
        .catch(() => {});
    }

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
    invalidateAthleteCache();
    return prisma.athlete.findUniqueOrThrow({
      where: { id: athlete.id },
      include: includeUser,
    });
  },

  async isentarLesao(id: string) {
    const athlete = await this.findById(id);
    if (athlete.status !== "lesao") {
      throw new AppError("Atleta não está com lesão", 400);
    }
    const updated = await prisma.athlete.update({
      where: { id },
      data: { monthlyPaymentStatus: "isento" },
    });
    invalidateAthleteCache();
    return updated;
  },

  async softDelete(id: string) {
    await this.findById(id);

    const result = await prisma.athlete.update({
      where: { id },
      data: { status: "inativo" },
    });
    invalidateAthleteCache();
    return result;
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
        // Use the standard monthly fee from settings; prorate for first month
        const setting = await prisma.trainingSetting.findFirst({ select: { monthlyFeeAmount: true } });
        const defaultAmount = Number(setting?.monthlyFeeAmount ?? 0);

        let amount = defaultAmount;
        let firstMonthDesc = "Mensalidade";
        if (athlete.activatedAt) {
          const activated = new Date(athlete.activatedAt);
          const activatedYear = activated.getUTCFullYear();
          const activatedMonth = activated.getUTCMonth() + 1;
          if (activatedYear === year && activatedMonth === month + 1) {
            const activatedDay = activated.getUTCDate();
            if (activatedDay > 15) {
              amount = defaultAmount / 2;
              firstMonthDesc = "Mensalidade (proporcional)";
            }
          }
        }

        await prisma.$queryRaw`
          INSERT INTO "Payment" (id, "athleteId", description, amount, type, category, status, "dueDate", "referenceMonth", "paidAt", "updatedAt")
          VALUES (
            ${randomUUID()}, ${id}, ${firstMonthDesc}, ${amount}, 'receita', 'Mensalidade',
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

    const updated = await prisma.athlete.update({
      where: { id },
      data: { monthlyPaymentStatus: status as MonthlyPaymentStatus },
      include: includeUser,
    });
    invalidateAthleteCache();
    return updated;
  },

  async getPaymentStatusHistory(id: string) {
    await this.findById(id);
    return prisma.paymentStatusHistory.findMany({
      where: { athleteId: id },
      orderBy: { createdAt: "desc" },
    });
  },
};


