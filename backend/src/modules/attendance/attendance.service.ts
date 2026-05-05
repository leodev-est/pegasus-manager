import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";
import { notificationsService } from "../notifications/notifications.service";
import {
  OFFICIAL_TRAINING_MODALITY,
  OFFICIAL_TRAINING_PLACE,
  OFFICIAL_TRAINING_START_DATE,
  OFFICIAL_TRAINING_TIME,
  dateKeyToDate,
  getBrazilDateKey,
  getOfficialTrainingDatesForMonth,
  isBlockedTrainingDate,
  isOfficialPegasusTrainingDate,
  parseMonthYear,
  toTrainingDateKey,
} from "../../utils/trainingDates";

const allowedAttendanceStatuses = ["presente", "falta", "justificada"] as const;

type AttendanceStatus = (typeof allowedAttendanceStatuses)[number];

type FrequencyFilters = {
  athleteId?: string;
  month?: string;
  year?: string;
};

function dayRange(dateKey: string) {
  const start = new Date(`${dateKey}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function monthRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { start, end };
}

function getTrainingMeta(dateKey: string) {
  return {
    date: dateKey,
    horario: OFFICIAL_TRAINING_TIME,
    local: OFFICIAL_TRAINING_PLACE,
    modalidade: OFFICIAL_TRAINING_MODALITY,
  };
}

function validateAttendanceStatus(status?: string): asserts status is AttendanceStatus {
  if (!status || !allowedAttendanceStatuses.includes(status as AttendanceStatus)) {
    throw new AppError("Status deve ser presente, falta ou justificada", 400);
  }
}

async function getAthleteForUser(userId: string, requireActive = false) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { athlete: true },
  });

  if (!user) {
    throw new AppError("Seu usuario nao esta vinculado a um atleta.", 403);
  }

  let { athlete } = user;

  // Fallback: link athlete by name when user.athleteId is null (e.g. staff who are also athletes)
  if (!athlete && user.name) {
    const candidates = await prisma.athlete.findMany({
      where: { name: user.name },
      take: 2,
    });

    if (candidates.length === 1) {
      athlete = candidates[0];
      await prisma.user.update({ where: { id: userId }, data: { athleteId: athlete.id } });
    }
  }

  if (!athlete) {
    throw new AppError("Seu usuario nao esta vinculado a um atleta.", 403);
  }

  if (requireActive && athlete.status !== "ativo") {
    throw new AppError("Check-in disponivel apenas para atletas ativos.", 403);
  }

  return athlete;
}

async function findTrainingByDate(dateKey: string) {
  const { start, end } = dayRange(dateKey);

  return prisma.training.findFirst({
    where: {
      date: {
        gte: start,
        lt: end,
      },
    },
    orderBy: { date: "asc" },
  });
}

async function ensureOfficialTrainingForDate(dateKey: string) {
  const existing = await findTrainingByDate(dateKey);

  if (existing) {
    return existing;
  }

  if (!isOfficialPegasusTrainingDate(dateKey)) {
    return null;
  }

  return prisma.training.create({
    data: {
      category: OFFICIAL_TRAINING_MODALITY,
      createdBy: "Pegasus",
      date: dateKeyToDate(dateKey),
      notes: `Treino oficial Pegasus. Local: ${OFFICIAL_TRAINING_PLACE}. Horario: ${OFFICIAL_TRAINING_TIME}.`,
      objective: "Treino oficial semanal do Projeto Pegasus.",
      title: "Treino oficial Pegasus",
    },
  });
}

async function getTrainingDatesForMonth(year: number, month: number) {
  const { start, end } = monthRange(year, month);
  const trainings = await prisma.training.findMany({
    where: {
      date: {
        gte: start,
        lt: end,
      },
    },
    orderBy: { date: "asc" },
  });

  const dateKeys = new Set(getOfficialTrainingDatesForMonth(year, month));

  for (const training of trainings) {
    const dateKey = toTrainingDateKey(training.date);
    if (dateKey >= OFFICIAL_TRAINING_START_DATE && !isBlockedTrainingDate(dateKey)) {
      dateKeys.add(dateKey);
    }
  }

  return Array.from(dateKeys).sort();
}

function summarizeDetails(
  dateKeys: string[],
  attendances: Array<{
    id: string;
    status: string;
    checkedInAt: Date;
    training: { date: Date };
  }>,
) {
  const todayKey = getBrazilDateKey();
  const attendancesByDate = new Map(
    attendances.map((attendance) => [toTrainingDateKey(attendance.training.date), attendance]),
  );

  const details = dateKeys.map((dateKey) => {
    const attendance = attendancesByDate.get(dateKey);
    const status = attendance?.status ?? (dateKey <= todayKey ? "falta" : "programado");

    return {
      attendanceId: attendance?.id ?? null,
      checkedInAt: attendance?.checkedInAt ?? null,
      ...getTrainingMeta(dateKey),
      status,
    };
  });

  const countedDetails = details.filter((detail) => detail.status !== "programado");
  const presencas = countedDetails.filter((detail) => detail.status === "presente").length;
  const justificadas = countedDetails.filter((detail) => detail.status === "justificada").length;
  const faltas = countedDetails.filter((detail) => detail.status === "falta").length;
  const totalTreinos = countedDetails.length;
  const percentual = totalTreinos > 0 ? Math.round(((presencas + justificadas) / totalTreinos) * 100) : 0;

  return {
    details,
    faltas,
    justificadas,
    percentual,
    presencas,
    totalTreinos,
  };
}

function getAthleteTrainingDates(
  dateKeys: string[],
  athlete: { activatedAt: Date | null; createdAt: Date; status: string },
) {
  if (athlete.status !== "ativo") {
    return [];
  }

  const activeStartKey = toTrainingDateKey(athlete.activatedAt ?? athlete.createdAt);
  return dateKeys.filter((dateKey) => dateKey >= activeStartKey);
}

export const attendanceService = {
  async getTodayCheckIn(userId: string) {
    const todayKey = getBrazilDateKey();
    const training = await ensureOfficialTrainingForDate(todayKey);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { athlete: true },
    });

    if (!training) {
      return {
        available: false,
        checkedIn: false,
        message: "Não há treino disponível para check-in hoje.",
        training: null,
      };
    }

    if (user?.athlete && user.athlete.status !== "ativo") {
      return {
        available: false,
        checkedIn: false,
        message: "Check-in disponivel apenas para atletas ativos.",
        training: null,
      };
    }

    if (user?.athlete) {
      await notificationsService.createOnceTodayForUser(user.id, {
        message: "Hoje tem treino às 17:30.",
        title: "Treino hoje",
        type: "treino",
      });
    }

    const attendance = user?.athlete
      ? await prisma.trainingAttendance.findUnique({
          where: {
            trainingId_athleteId: {
              athleteId: user.athlete.id,
              trainingId: training.id,
            },
          },
        })
      : null;

    const checkedIn = attendance?.status === "presente";

    return {
      available: true,
      attendance,
      checkedIn,
      message: checkedIn ? "Presença confirmada." : "Treino disponível para check-in.",
      training: {
        id: training.id,
        title: training.title,
        ...getTrainingMeta(toTrainingDateKey(training.date)),
      },
    };
  },

  async checkIn(userId: string, trainingId?: string) {
    if (!trainingId) {
      throw new AppError("Treino é obrigatório para o check-in", 400);
    }

    const athlete = await getAthleteForUser(userId, true);
    const training = await prisma.training.findUnique({
      where: { id: trainingId },
    });

    if (!training) {
      throw new AppError("Treino não encontrado", 404);
    }

    const trainingDateKey = toTrainingDateKey(training.date);
    const todayKey = getBrazilDateKey();

    if (trainingDateKey !== todayKey) {
      throw new AppError("Check-in permitido apenas para o treino de hoje.", 400);
    }

    const existing = await prisma.trainingAttendance.findUnique({
      where: {
        trainingId_athleteId: {
          athleteId: athlete.id,
          trainingId,
        },
      },
    });

    if (existing) {
      if (existing.status === "presente") {
        throw new AppError("Você já marcou presença neste treino.", 409);
      }

      return prisma.trainingAttendance.update({
        where: { id: existing.id },
        data: {
          checkedInAt: new Date(),
          status: "presente",
        },
      });
    }

    return prisma.trainingAttendance.create({
      data: {
        athleteId: athlete.id,
        status: "presente",
        trainingId,
      },
    });
  },

  async getMyFrequency(userId: string, filters: FrequencyFilters) {
    const athlete = await getAthleteForUser(userId);
    const { month, year } = parseMonthYear(filters.month, filters.year);
    const dateKeys = await getTrainingDatesForMonth(year, month);
    const athleteDateKeys = getAthleteTrainingDates(dateKeys, athlete);
    const { start, end } = monthRange(year, month);
    const attendances = await prisma.trainingAttendance.findMany({
      where: {
        athleteId: athlete.id,
        training: {
          date: {
            gte: start,
            lt: end,
          },
        },
      },
      include: { training: { select: { date: true } } },
      orderBy: { checkedInAt: "asc" },
    });

    // Include dates where attendance was actually recorded (e.g. via Chamada before activatedAt)
    const attendanceDateKeys = attendances
      .map((a) => toTrainingDateKey(a.training.date))
      .filter((key) => dateKeys.includes(key));
    const mergedDateKeys = Array.from(new Set([...athleteDateKeys, ...attendanceDateKeys])).sort();

    const summary = summarizeDetails(mergedDateKeys, attendances);

    return {
      athlete: {
        id: athlete.id,
        name: athlete.name,
      },
      month,
      year,
      ...summary,
    };
  },

  async getFrequency(filters: FrequencyFilters) {
    const { month, year } = parseMonthYear(filters.month, filters.year);
    const dateKeys = await getTrainingDatesForMonth(year, month);
    const { start, end } = monthRange(year, month);
    const athletes = await prisma.athlete.findMany({
      where: {
        id: filters.athleteId,
        status: "ativo",
      },
      orderBy: { name: "asc" },
    });
    const todayKey = getBrazilDateKey();
    const countedDateKeys = dateKeys.filter((dateKey) => dateKey <= todayKey);
    const trainingsByDate = new Map<string, string>();

    for (const dateKey of countedDateKeys) {
      const training = await ensureOfficialTrainingForDate(dateKey);
      if (training) {
        trainingsByDate.set(dateKey, training.id);
      }
    }

    if (athletes.length > 0 && trainingsByDate.size > 0) {
      await prisma.trainingAttendance.createMany({
        data: athletes.flatMap((athlete) =>
          getAthleteTrainingDates(countedDateKeys, athlete).map((dateKey) => ({
            athleteId: athlete.id,
            status: "falta",
            trainingId: trainingsByDate.get(dateKey)!,
          })),
        ),
        skipDuplicates: true,
      });
    }

    const attendances = await prisma.trainingAttendance.findMany({
      where: {
        athleteId: filters.athleteId,
        training: {
          date: {
            gte: start,
            lt: end,
          },
        },
      },
      include: {
        training: {
          select: { date: true },
        },
      },
      orderBy: { checkedInAt: "asc" },
    });
    const attendancesByAthlete = new Map<string, typeof attendances>();

    for (const attendance of attendances) {
      attendancesByAthlete.set(attendance.athleteId, [
        ...(attendancesByAthlete.get(attendance.athleteId) ?? []),
        attendance,
      ]);
    }

    return athletes.map((athlete) => {
      const athleteDateKeys = getAthleteTrainingDates(dateKeys, athlete);
      const athleteAttendances = attendancesByAthlete.get(athlete.id) ?? [];

      // Include dates with actual attendance records even if before activatedAt
      const attendanceDateKeys = athleteAttendances
        .map((a) => toTrainingDateKey(a.training.date))
        .filter((key) => dateKeys.includes(key));
      const mergedDateKeys = Array.from(new Set([...athleteDateKeys, ...attendanceDateKeys])).sort();

      return {
        athlete: {
          id: athlete.id,
          category: athlete.category,
          name: athlete.name,
          position: athlete.position,
        },
        month,
        year,
        ...summarizeDetails(mergedDateKeys, athleteAttendances),
      };
    });
  },

  async getChamada(dateKey: string) {
    const training = await ensureOfficialTrainingForDate(dateKey);

    if (!training) {
      return { available: false, date: dateKey, training: null, athletes: [] };
    }

    const athletes = await prisma.athlete.findMany({
      where: { status: "ativo" },
      orderBy: { name: "asc" },
      include: {
        attendances: {
          where: { trainingId: training.id },
        },
      },
    });

    return {
      available: true,
      date: dateKey,
      training: {
        id: training.id,
        title: training.title,
        ...getTrainingMeta(dateKey),
      },
      athletes: athletes.map((athlete) => ({
        id: athlete.id,
        name: athlete.name,
        category: athlete.category,
        attendanceId: athlete.attendances[0]?.id ?? null,
        status: athlete.attendances[0]?.status ?? null,
      })),
    };
  },

  async markChamadaBulk(dateKey: string, entries: Array<{ athleteId: string; status: string }>) {
    const training = await ensureOfficialTrainingForDate(dateKey);

    if (!training) {
      throw new AppError("Não há treino oficial para esta data", 404);
    }

    for (const entry of entries) {
      validateAttendanceStatus(entry.status);
    }

    return Promise.all(
      entries.map(({ athleteId, status }) =>
        prisma.trainingAttendance.upsert({
          where: { trainingId_athleteId: { trainingId: training.id, athleteId } },
          create: { trainingId: training.id, athleteId, status },
          update: { status },
        }),
      ),
    );
  },

  async updateAttendance(id: string, payload: { notes?: string | null; status?: string }) {
    validateAttendanceStatus(payload.status);

    const attendance = await prisma.trainingAttendance.update({
      where: { id },
      data: {
        notes: payload.notes === undefined ? undefined : payload.notes?.trim() || null,
        status: payload.status,
      },
      include: {
        athlete: {
          include: {
            user: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (payload.status === "falta") {
      await notificationsService.createForUser(attendance.athlete.user?.id, {
        message: "Sua presença foi marcada como falta.",
        title: "Falta registrada",
        type: "frequencia",
      });
    }

    return attendance;
  },
};
