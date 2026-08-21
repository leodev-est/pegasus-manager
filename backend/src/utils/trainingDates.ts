import { prisma } from "../config/prisma";

export const OFFICIAL_TRAINING_START_DATE = "2026-04-25";
export const OFFICIAL_TRAINING_END_DATE = "2026-12-31";
export const OFFICIAL_TRAINING_MODALITY = "Voleibol";

const WEEKDAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

export type Turma = {
  id: string;
  name: string;
  daysOfWeek: string[];
  time: string;
  location: string;
  dependency: string | null;
  startDate: string | null;
};

export async function loadBlockedDates(): Promise<string[]> {
  const setting = await prisma.trainingSetting.findUnique({
    where: { id: "singleton" },
    select: { blockedDates: true },
  });
  return setting?.blockedDates ?? [];
}

export async function loadActiveTurmas(): Promise<Turma[]> {
  return prisma.turma.findMany({
    where: { active: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true, name: true, daysOfWeek: true, time: true, location: true, dependency: true, startDate: true },
  });
}

export async function loadTrainingSchedule() {
  const [setting, turmas] = await Promise.all([
    prisma.trainingSetting.findUnique({
      where: { id: "singleton" },
      select: {
        blockedDates: true,
        trainingDaysOfWeek: true,
        trainingTime: true,
        trainingLocation: true,
        trainingDependency: true,
      },
    }),
    loadActiveTurmas(),
  ]);

  return {
    blockedDates: setting?.blockedDates ?? [],
    // Configuração "legada": só vale pra datas em que nenhuma Turma se aplica
    // (comportamento de turma única, como sempre foi antes de existir Turma).
    legacyDaysOfWeek: setting?.trainingDaysOfWeek?.length ? setting.trainingDaysOfWeek : ["saturday"],
    legacyTime: setting?.trainingTime ?? "17:30 às 19:00",
    legacyLocation: setting?.trainingLocation ?? "Jerusalém",
    legacyDependency: setting?.trainingDependency ?? null,
    turmas,
  };
}

export type TrainingSchedule = Awaited<ReturnType<typeof loadTrainingSchedule>>;

function toDateKey(date: Date | string) {
  if (date instanceof Date) {
    return date.toISOString().slice(0, 10);
  }

  return date.slice(0, 10);
}

export function toTrainingDateKey(date: Date | string) {
  return toDateKey(date);
}

export function isBlockedTrainingDate(date: Date | string, blockedDates: string[]) {
  const dateKey = toDateKey(date);
  return blockedDates.includes(dateKey);
}

export function getBrazilDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

export function dateKeyToDate(dateKey: string) {
  // 20:30 UTC = 17:30 BRT (horário oficial dos treinos)
  return new Date(`${dateKey}T20:30:00.000Z`);
}

function weekdayOf(dateKey: string): string {
  return WEEKDAY_KEYS[dateKeyToDate(dateKey).getUTCDay()];
}

/** Turmas cujo dia da semana e data de início cobrem essa data. */
export function turmasForDate(dateKey: string, turmas: Turma[]): Turma[] {
  const weekday = weekdayOf(dateKey);
  return turmas.filter(
    (turma) => turma.daysOfWeek.includes(weekday) && (!turma.startDate || dateKey >= turma.startDate),
  );
}

export function isOfficialTrainingDate(
  dateKey: string,
  blockedDates: string[],
  legacyDaysOfWeek: string[],
  turmas: Turma[],
): boolean {
  if (
    dateKey < OFFICIAL_TRAINING_START_DATE ||
    dateKey > OFFICIAL_TRAINING_END_DATE ||
    isBlockedTrainingDate(dateKey, blockedDates)
  ) {
    return false;
  }

  if (turmasForDate(dateKey, turmas).length > 0) return true;

  return legacyDaysOfWeek.includes(weekdayOf(dateKey));
}

export function getOfficialTrainingDatesForMonth(
  year: number,
  month: number,
  blockedDates: string[],
  legacyDaysOfWeek: string[],
  turmas: Turma[],
) {
  const dates: string[] = [];
  const cursor = new Date(Date.UTC(year, month - 1, 1, 12));

  while (cursor.getUTCMonth() === month - 1) {
    const dateKey = toDateKey(cursor);

    if (isOfficialTrainingDate(dateKey, blockedDates, legacyDaysOfWeek, turmas)) {
      dates.push(dateKey);
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

type TrainingMeta = { time: string; location: string; dependency: string | null; label: string | null };

/** Horário/local aplicáveis: da Turma se ela cobre a data, senão o legado. */
export function resolveTrainingMeta(
  dateKey: string,
  turma: Turma | null,
  schedule: Pick<TrainingSchedule, "legacyTime" | "legacyLocation" | "legacyDependency">,
): TrainingMeta {
  if (turma) {
    return { time: turma.time, location: turma.location, dependency: turma.dependency, label: turma.name };
  }
  return { time: schedule.legacyTime, location: schedule.legacyLocation, dependency: schedule.legacyDependency, label: null };
}

export function parseMonthYear(month?: string, year?: string) {
  const now = new Date();
  const parsedMonth = Number(month ?? now.getMonth() + 1);
  const parsedYear = Number(year ?? now.getFullYear());

  if (!Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
    throw new Error("Mes invalido");
  }

  if (!Number.isInteger(parsedYear) || parsedYear < 2020 || parsedYear > 2100) {
    throw new Error("Ano invalido");
  }

  return { month: parsedMonth, year: parsedYear };
}
