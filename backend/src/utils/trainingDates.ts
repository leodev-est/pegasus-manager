export const BLOCKED_TRAINING_DATES = ["2026-05-30", "2026-06-20", "2026-09-26"] as const;
export const OFFICIAL_TRAINING_START_DATE = "2026-04-25";
export const OFFICIAL_TRAINING_END_DATE = "2026-12-31";
export const OFFICIAL_TRAINING_TIME = "17:30 as 19:00";
export const OFFICIAL_TRAINING_PLACE = "Jerusalem";
export const OFFICIAL_TRAINING_MODALITY = "Voleibol";

function toDateKey(date: Date | string) {
  if (date instanceof Date) {
    return date.toISOString().slice(0, 10);
  }

  return date.slice(0, 10);
}

export function toTrainingDateKey(date: Date | string) {
  return toDateKey(date);
}

export function isBlockedTrainingDate(date: Date | string) {
  const dateKey = toDateKey(date);

  return BLOCKED_TRAINING_DATES.includes(dateKey as (typeof BLOCKED_TRAINING_DATES)[number]);
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
  return new Date(`${dateKey}T12:00:00.000Z`);
}

export function isOfficialPegasusTrainingDate(date: Date | string) {
  const dateKey = toDateKey(date);

  if (
    dateKey < OFFICIAL_TRAINING_START_DATE ||
    dateKey > OFFICIAL_TRAINING_END_DATE ||
    isBlockedTrainingDate(dateKey)
  ) {
    return false;
  }

  return dateKeyToDate(dateKey).getUTCDay() === 6;
}

export function getOfficialTrainingDatesForMonth(year: number, month: number) {
  const dates: string[] = [];
  const cursor = new Date(Date.UTC(year, month - 1, 1, 12));

  while (cursor.getUTCMonth() === month - 1) {
    const dateKey = toDateKey(cursor);

    if (isOfficialPegasusTrainingDate(dateKey)) {
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
