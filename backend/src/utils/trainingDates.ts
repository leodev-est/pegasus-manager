import { prisma } from "../config/prisma";

export const OFFICIAL_TRAINING_START_DATE = "2026-04-25";
export const OFFICIAL_TRAINING_END_DATE = "2026-12-31";
export const OFFICIAL_TRAINING_MODALITY = "Voleibol";

// A partir desta data os treinos oficiais de sábado passam a ser divididos em
// duas turmas (feminino/masculino), cada uma com seu próprio horário. Antes
// dela, o comportamento é o de turma única (gender null), como sempre foi.
export const GENDER_SPLIT_START_DATE = "2026-08-22";

export type TrainingGender = "feminino" | "masculino";

const WEEKDAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

export function isGenderSplitDate(date: Date | string): boolean {
  return toDateKey(date) >= GENDER_SPLIT_START_DATE;
}

export async function loadBlockedDates(): Promise<string[]> {
  const setting = await prisma.trainingSetting.findUnique({
    where: { id: "singleton" },
    select: { blockedDates: true },
  });
  return setting?.blockedDates ?? [];
}

export async function loadTrainingSchedule() {
  const setting = await prisma.trainingSetting.findUnique({
    where: { id: "singleton" },
    select: {
      blockedDates: true,
      trainingDaysOfWeek: true,
      trainingTime: true,
      trainingTimeFemale: true,
      trainingTimeMale: true,
      trainingLocation: true,
    },
  });
  return {
    blockedDates: setting?.blockedDates ?? [],
    trainingDaysOfWeek: setting?.trainingDaysOfWeek?.length ? setting.trainingDaysOfWeek : ["saturday"],
    trainingTime: setting?.trainingTime ?? "17:30 às 19:00",
    trainingTimeFemale: setting?.trainingTimeFemale ?? "16:00 às 17:30",
    trainingTimeMale: setting?.trainingTimeMale ?? "17:30 às 19:00",
    trainingLocation: setting?.trainingLocation ?? "Jerusalém",
  };
}

export type TrainingSchedule = Awaited<ReturnType<typeof loadTrainingSchedule>>;

/** Horário aplicável para uma data/turma: legado antes do split, por gênero depois. */
export function resolveTrainingTime(
  dateKey: string,
  gender: TrainingGender | null,
  schedule: Pick<TrainingSchedule, "trainingTime" | "trainingTimeFemale" | "trainingTimeMale">,
): string {
  if (!isGenderSplitDate(dateKey) || !gender) return schedule.trainingTime;
  return gender === "feminino" ? schedule.trainingTimeFemale : schedule.trainingTimeMale;
}

export function trainingGenderLabel(gender: TrainingGender | null): string | null {
  if (!gender) return null;
  return gender === "feminino" ? "Feminino" : "Masculino";
}

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

export function isOfficialTrainingDate(date: Date | string, blockedDates: string[], trainingDaysOfWeek: string[]) {
  const dateKey = toDateKey(date);

  if (
    dateKey < OFFICIAL_TRAINING_START_DATE ||
    dateKey > OFFICIAL_TRAINING_END_DATE ||
    isBlockedTrainingDate(dateKey, blockedDates)
  ) {
    return false;
  }

  const d = dateKeyToDate(dateKey);
  const weekday = WEEKDAY_KEYS[d.getUTCDay()];

  return trainingDaysOfWeek.includes(weekday);
}

export function getOfficialTrainingDatesForMonth(
  year: number,
  month: number,
  blockedDates: string[],
  trainingDaysOfWeek: string[],
) {
  const dates: string[] = [];
  const cursor = new Date(Date.UTC(year, month - 1, 1, 12));

  while (cursor.getUTCMonth() === month - 1) {
    const dateKey = toDateKey(cursor);

    if (isOfficialTrainingDate(dateKey, blockedDates, trainingDaysOfWeek)) {
      dates.push(dateKey);
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
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
