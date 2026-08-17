import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";
import { injuriesService } from "../injuries/injuries.service";
import { notificationsService } from "../notifications/notifications.service";
import {
  OFFICIAL_TRAINING_MODALITY,
  OFFICIAL_TRAINING_START_DATE,
  dateKeyToDate,
  getBrazilDateKey,
  getOfficialTrainingDatesForMonth,
  isBlockedTrainingDate,
  isGenderSplitDate,
  isOfficialTrainingDate,
  loadBlockedDates,
  loadTrainingSchedule,
  parseMonthYear,
  resolveTrainingTime,
  toTrainingDateKey,
  trainingGenderLabel,
  type TrainingGender,
  type TrainingSchedule,
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

function getTrainingMeta(dateKey: string, gender: TrainingGender | null, schedule: TrainingSchedule) {
  const effectiveGender = isGenderSplitDate(dateKey) ? gender : null;
  return {
    date: dateKey,
    horario: resolveTrainingTime(dateKey, gender, schedule),
    local: schedule.trainingLocation,
    modalidade: OFFICIAL_TRAINING_MODALITY,
    turma: trainingGenderLabel(effectiveGender),
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

async function findTrainingByDate(dateKey: string, gender: TrainingGender | null) {
  const { start, end } = dayRange(dateKey);

  return prisma.training.findFirst({
    where: {
      date: {
        gte: start,
        lt: end,
      },
      gender,
    },
    orderBy: { date: "asc" },
  });
}

async function ensureOfficialTrainingForDate(
  dateKey: string,
  gender: TrainingGender | null,
  blockedDates: string[],
  trainingDaysOfWeek: string[],
  schedule: TrainingSchedule,
) {
  if (!isOfficialTrainingDate(dateKey, blockedDates, trainingDaysOfWeek)) {
    return null;
  }

  // Antes da data de corte a turma é sempre única (gender null), independente
  // do que for passado — preserva o comportamento anterior ao split.
  const effectiveGender = isGenderSplitDate(dateKey) ? gender : null;

  const existing = await findTrainingByDate(dateKey, effectiveGender);

  if (existing) {
    return existing;
  }

  const settings = await prisma.trainingSetting.findUnique({
    where: { id: "singleton" },
    select: { systemName: true },
  });
  const orgName = settings?.systemName ?? "Pegasus Manager";
  const time = resolveTrainingTime(dateKey, gender, schedule);
  const label = trainingGenderLabel(effectiveGender);
  const suffix = label ? ` — ${label}` : "";

  return prisma.training.create({
    data: {
      category: OFFICIAL_TRAINING_MODALITY,
      createdBy: orgName,
      date: dateKeyToDate(dateKey),
      gender: effectiveGender,
      notes: `Treino oficial ${orgName}${suffix}. Local: ${schedule.trainingLocation}. Horario: ${time}.`,
      objective: `Treino oficial semanal do Projeto ${orgName}${suffix}.`,
      title: `Treino oficial ${orgName}${suffix}`,
    },
  });
}

async function getTrainingDatesForMonth(year: number, month: number) {
  const { blockedDates, trainingDaysOfWeek } = await loadTrainingSchedule();
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

  const dateKeys = new Set(getOfficialTrainingDatesForMonth(year, month, blockedDates, trainingDaysOfWeek));

  for (const training of trainings) {
    const dateKey = toTrainingDateKey(training.date);
    if (dateKey >= OFFICIAL_TRAINING_START_DATE && !isBlockedTrainingDate(dateKey, blockedDates)) {
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
  gender: TrainingGender | null,
  schedule: TrainingSchedule,
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
      ...getTrainingMeta(dateKey, gender, schedule),
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
    const schedule = await loadTrainingSchedule();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { athlete: true },
    });

    if (isGenderSplitDate(todayKey) && user?.athlete && !user.athlete.gender) {
      return {
        available: false,
        checkedIn: false,
        message: "Seu cadastro está sem turma (feminino/masculino) definida. Fale com o RH para liberar o check-in.",
        training: null,
      };
    }

    const gender = (user?.athlete?.gender ?? null) as TrainingGender | null;
    const training = await ensureOfficialTrainingForDate(
      todayKey,
      gender,
      schedule.blockedDates,
      schedule.trainingDaysOfWeek,
      schedule,
    );

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
        message: `Hoje tem treino às ${resolveTrainingTime(todayKey, gender, schedule)}.`,
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
        ...getTrainingMeta(toTrainingDateKey(training.date), gender, schedule),
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
    const gender = (athlete.gender ?? null) as TrainingGender | null;
    const { month, year } = parseMonthYear(filters.month, filters.year);
    const schedule = await loadTrainingSchedule();
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

    const summary = summarizeDetails(mergedDateKeys, attendances, gender, schedule);

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

  async getMyTotalFrequency(userId: string) {
    const athlete = await getAthleteForUser(userId);
    const gender = (athlete.gender ?? null) as TrainingGender | null;
    const todayKey = getBrazilDateKey();
    const schedule = await loadTrainingSchedule();

    const [startYear, startMonthNum] = OFFICIAL_TRAINING_START_DATE.split("-").map(Number);
    const now = new Date();
    const endYear = now.getFullYear();
    const endMonth = now.getMonth() + 1;

    const allDateKeySet = new Set<string>();
    let curYear = startYear;
    let curMonth = startMonthNum;

    while (curYear < endYear || (curYear === endYear && curMonth <= endMonth)) {
      const monthDates = await getTrainingDatesForMonth(curYear, curMonth);
      for (const dateKey of monthDates) {
        if (dateKey <= todayKey) allDateKeySet.add(dateKey);
      }
      curMonth++;
      if (curMonth > 12) { curMonth = 1; curYear++; }
    }

    const allDateKeys = Array.from(allDateKeySet).sort();

    const attendances = await prisma.trainingAttendance.findMany({
      where: { athleteId: athlete.id },
      include: { training: { select: { date: true } } },
      orderBy: { checkedInAt: "asc" },
    });

    const athleteDateKeys = getAthleteTrainingDates(allDateKeys, athlete);
    const attendanceDateKeys = attendances
      .map((a) => toTrainingDateKey(a.training.date))
      .filter((key) => allDateKeys.includes(key));
    const mergedDateKeys = Array.from(new Set([...athleteDateKeys, ...attendanceDateKeys])).sort();

    return summarizeDetails(mergedDateKeys, attendances, gender, schedule);
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
    const schedule = await loadTrainingSchedule();
    const trainingsByDate = new Map<string, Partial<Record<"legacy" | TrainingGender, string>>>();

    for (const dateKey of countedDateKeys) {
      if (!isGenderSplitDate(dateKey)) {
        const training = await ensureOfficialTrainingForDate(dateKey, null, schedule.blockedDates, schedule.trainingDaysOfWeek, schedule);
        if (training) trainingsByDate.set(dateKey, { legacy: training.id });
        continue;
      }

      const [female, male] = await Promise.all([
        ensureOfficialTrainingForDate(dateKey, "feminino", schedule.blockedDates, schedule.trainingDaysOfWeek, schedule),
        ensureOfficialTrainingForDate(dateKey, "masculino", schedule.blockedDates, schedule.trainingDaysOfWeek, schedule),
      ]);
      trainingsByDate.set(dateKey, {
        ...(female ? { feminino: female.id } : {}),
        ...(male ? { masculino: male.id } : {}),
      });
    }

    if (athletes.length > 0 && trainingsByDate.size > 0) {
      await prisma.trainingAttendance.createMany({
        data: athletes.flatMap((athlete) => {
          const gender = (athlete.gender ?? null) as TrainingGender | null;
          return getAthleteTrainingDates(countedDateKeys, athlete).flatMap((dateKey) => {
            const entry = trainingsByDate.get(dateKey);
            if (!entry) return [];
            const trainingId = isGenderSplitDate(dateKey)
              ? (gender ? entry[gender] : undefined)
              : entry.legacy;
            if (!trainingId) return [];
            return [{ athleteId: athlete.id, status: "falta", trainingId }];
          });
        }),
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
      const gender = (athlete.gender ?? null) as TrainingGender | null;
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
          gender: athlete.gender,
          name: athlete.name,
          position: athlete.position,
        },
        month,
        year,
        ...summarizeDetails(mergedDateKeys, athleteAttendances, gender, schedule),
      };
    });
  },

  async getChamada(dateKey: string, requestedGender?: TrainingGender) {
    const split = isGenderSplitDate(dateKey);
    if (split && !requestedGender) {
      throw new AppError("Selecione a turma (feminino ou masculino) para ver a chamada.", 400);
    }
    const gender = split ? requestedGender! : null;

    const schedule = await loadTrainingSchedule();
    const isBlocked = isBlockedTrainingDate(dateKey, schedule.blockedDates);
    const training = await ensureOfficialTrainingForDate(dateKey, gender, schedule.blockedDates, schedule.trainingDaysOfWeek, schedule);

    if (!training) {
      return {
        available: false,
        date: dateKey,
        gender,
        training: null,
        athletes: [],
        athletesWithoutGender: [],
        reason: isBlocked ? "cancelado" : "sem_treino",
      };
    }

    // Só exibe atletas que já estavam no time na data do treino
    const trainingDayEnd = new Date(`${dateKey}T23:59:59.999Z`);
    const activeAthleteWhere = {
      status: "ativo",
      OR: [
        { activatedAt: { lte: trainingDayEnd } },
        { activatedAt: null, createdAt: { lte: trainingDayEnd } },
      ],
    };

    const [athletes, athletesWithoutGender] = await Promise.all([
      prisma.athlete.findMany({
        where: split ? { ...activeAthleteWhere, gender } : activeAthleteWhere,
        orderBy: { name: "asc" },
        include: {
          attendances: {
            where: { trainingId: training.id },
          },
        },
      }),
      split
        ? prisma.athlete.findMany({
            where: { ...activeAthleteWhere, gender: null },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
          })
        : Promise.resolve([]),
    ]);

    const athleteIds = athletes.map((a) => a.id);
    const [frequencyMap, injuredSet] = await Promise.all([
      this.getAthletesSummary(),
      injuriesService.getActiveForAthletes(athleteIds),
    ]);

    return {
      available: true,
      date: dateKey,
      gender,
      training: {
        id: training.id,
        title: training.title,
        ...getTrainingMeta(dateKey, gender, schedule),
      },
      athletes: athletes.map((athlete) => ({
        id: athlete.id,
        name: athlete.name,
        category: athlete.category,
        attendanceId: athlete.attendances[0]?.id ?? null,
        status: athlete.attendances[0]?.status ?? null,
        frequencyPercent: frequencyMap[athlete.id] ?? null,
        injured: injuredSet.has(athlete.id),
      })),
      athletesWithoutGender: athletesWithoutGender.map((a) => ({ id: a.id, name: a.name })),
    };
  },

  async markChamadaBulk(
    dateKey: string,
    entries: Array<{ athleteId: string; status: string }>,
    requestedGender?: TrainingGender,
  ) {
    const split = isGenderSplitDate(dateKey);
    if (split && !requestedGender) {
      throw new AppError("Selecione a turma (feminino ou masculino) para marcar a chamada.", 400);
    }
    const gender = split ? requestedGender! : null;

    const schedule = await loadTrainingSchedule();
    const training = await ensureOfficialTrainingForDate(dateKey, gender, schedule.blockedDates, schedule.trainingDaysOfWeek, schedule);

    if (!training) {
      throw new AppError("Não há treino oficial para esta data", 404);
    }

    for (const entry of entries) {
      validateAttendanceStatus(entry.status);
    }

    const results = await Promise.all(
      entries.map(({ athleteId, status }) =>
        prisma.trainingAttendance.upsert({
          where: { trainingId_athleteId: { trainingId: training.id, athleteId } },
          create: { trainingId: training.id, athleteId, status },
          update: { status },
        }),
      ),
    );

    // Check consecutive absences for athletes marked as "falta"
    const consecutiveThreshold = 3;
    const faltas = entries.filter((e) => e.status === "falta");
    for (const { athleteId } of faltas) {
      const recentAttendances = await prisma.trainingAttendance.findMany({
        where: { athleteId },
        orderBy: { createdAt: "desc" },
        take: consecutiveThreshold,
        include: { training: { select: { date: true } } },
      });

      const allFaltas = recentAttendances.length === consecutiveThreshold &&
        recentAttendances.every((a) => a.status === "falta");

      if (allFaltas) {
        const athlete = await prisma.athlete.findUnique({ where: { id: athleteId }, select: { name: true } });
        notificationsService
          .notifyByRoles(["RH", "Diretor", "Gestao"], {
            title: "Alerta de ausência",
            message: `${athlete?.name ?? "Atleta"} faltou os últimos ${consecutiveThreshold} treinos consecutivos.`,
            type: "frequencia",
          })
          .catch(() => {});
      }
    }

    return results;
  },

  async getAthletesSummary() {
    const [athletes, blockedDates] = await Promise.all([
      prisma.athlete.findMany({
        where: { status: "ativo" },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      loadBlockedDates(),
    ]);

    const todayKey = getBrazilDateKey();
    const summaries = await Promise.all(
      athletes.map(async (athlete) => {
        const attendances = await prisma.trainingAttendance.findMany({
          where: { athleteId: athlete.id },
          include: { training: { select: { date: true } } },
        });
        const counted = attendances.filter((a) => {
          const dateKey = toTrainingDateKey(a.training.date);
          return (
            dateKey <= todayKey &&
            a.status !== "programado" &&
            !isBlockedTrainingDate(dateKey, blockedDates)
          );
        });
        const presencas = counted.filter((a) => a.status === "presente").length;
        const justificadas = counted.filter((a) => a.status === "justificada").length;
        const total = counted.length;
        const percentual = total > 0 ? Math.round(((presencas + justificadas) / total) * 100) : null;
        return { athleteId: athlete.id, percentual };
      }),
    );

    return Object.fromEntries(summaries.map((s) => [s.athleteId, s.percentual]));
  },

  async getAttendanceRanking() {
    const athletes = await prisma.athlete.findMany({
      where: { status: "ativo" },
      select: { id: true, name: true, category: true, activatedAt: true, createdAt: true, status: true },
      orderBy: { name: "asc" },
    });

    const todayKey = getBrazilDateKey();

    // Build the complete set of official training date keys from the start date to today,
    // iterating month by month so we don't depend on "falta" records being in the DB.
    const [startYear, startMonthNum] = OFFICIAL_TRAINING_START_DATE.split("-").map(Number);
    const now = new Date();
    const endYear = now.getFullYear();
    const endMonth = now.getMonth() + 1;

    const allDateKeySet = new Set<string>();
    let curYear = startYear;
    let curMonth = startMonthNum;
    while (curYear < endYear || (curYear === endYear && curMonth <= endMonth)) {
      const monthDates = await getTrainingDatesForMonth(curYear, curMonth);
      for (const dateKey of monthDates) {
        if (dateKey <= todayKey) allDateKeySet.add(dateKey);
      }
      curMonth++;
      if (curMonth > 12) { curMonth = 1; curYear++; }
    }
    const allDateKeys = Array.from(allDateKeySet).sort();

    const results = await Promise.all(
      athletes.map(async (athlete) => {
        const attendances = await prisma.trainingAttendance.findMany({
          where: { athleteId: athlete.id },
          include: { training: { select: { date: true } } },
        });

        const attendanceByDate = new Map(
          attendances.map((a) => [toTrainingDateKey(a.training.date), a.status]),
        );

        // Official dates from activation onwards
        const athleteDateKeys = getAthleteTrainingDates(allDateKeys, athlete);
        // Also include dates with real attendance records even if before activatedAt
        const attendanceDateKeys = attendances
          .map((a) => toTrainingDateKey(a.training.date))
          .filter((key) => allDateKeys.includes(key));
        const mergedDateKeys = Array.from(new Set([...athleteDateKeys, ...attendanceDateKeys])).sort();

        let presencas = 0;
        let justificadas = 0;
        let faltas = 0;

        for (const dateKey of mergedDateKeys) {
          const status = attendanceByDate.get(dateKey);
          if (status === "presente") presencas++;
          else if (status === "justificada") justificadas++;
          else faltas++;
        }

        const total = mergedDateKeys.length;
        const percentual = total > 0 ? Math.round(((presencas + justificadas) / total) * 100) : null;

        return {
          athlete: { id: athlete.id, name: athlete.name, category: athlete.category },
          presencas,
          justificadas,
          faltas,
          total,
          percentual,
        };
      }),
    );

    return results.sort((a, b) => {
      if (a.percentual === null && b.percentual === null) return 0;
      if (a.percentual === null) return 1;
      if (b.percentual === null) return -1;
      return b.percentual - a.percentual;
    });
  },

  async getMonthlyStats() {
    const [startYear, startMonthNum] = OFFICIAL_TRAINING_START_DATE.split("-").map(Number);
    const now = new Date();
    const endYear = now.getFullYear();
    const endMonth = now.getMonth() + 1;
    const todayKey = getBrazilDateKey();

    const stats: Array<{ month: string; presencas: number; faltas: number; justificadas: number; total: number; percentual: number | null }> = [];

    let curYear = startYear;
    let curMonth = startMonthNum;

    while (curYear < endYear || (curYear === endYear && curMonth <= endMonth)) {
      const dateKeys = await getTrainingDatesForMonth(curYear, curMonth);
      const countedKeys = dateKeys.filter((k) => k <= todayKey);

      if (countedKeys.length > 0) {
        const { start, end } = monthRange(curYear, curMonth);
        const attendances = await prisma.trainingAttendance.findMany({
          where: { training: { date: { gte: start, lt: end } } },
          select: { status: true },
        });

        const presencas = attendances.filter((a) => a.status === "presente").length;
        const justificadas = attendances.filter((a) => a.status === "justificada").length;
        const faltas = attendances.filter((a) => a.status === "falta").length;
        const total = presencas + justificadas + faltas;
        const percentual = total > 0 ? Math.round(((presencas + justificadas) / total) * 100) : null;

        stats.push({
          month: `${curYear}-${String(curMonth).padStart(2, "0")}`,
          presencas,
          justificadas,
          faltas,
          total,
          percentual,
        });
      }

      curMonth++;
      if (curMonth > 12) { curMonth = 1; curYear++; }
    }

    return stats;
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
