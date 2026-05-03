import type { StatusTone } from "../../components/ui/StatusBadge";
import type { AttendanceStatus } from "../../services/attendanceService";

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "2-digit" }).format(
    new Date(value),
  );
}

export function formatDateLong(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "long", day: "2-digit", month: "long" }).format(
    new Date(value),
  );
}

export function formatTime(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function getCurrentMonthYear() {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

export function toMonthInput(month: number, year: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function fromMonthInput(value: string) {
  const [year, month] = value.split("-").map(Number);
  return { month, year };
}

export function statusLabel(status: AttendanceStatus) {
  const labels: Record<AttendanceStatus, string> = {
    falta: "Falta",
    justificada: "Justificada",
    presente: "Presente",
    programado: "Programado",
  };

  return labels[status];
}

export function statusTone(status: AttendanceStatus): StatusTone {
  const tones: Record<AttendanceStatus, StatusTone> = {
    falta: "danger",
    justificada: "warning",
    presente: "success",
    programado: "info",
  };

  return tones[status];
}
