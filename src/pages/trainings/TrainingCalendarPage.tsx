import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Lock,
  LockOpen,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { useToast } from "../../components/ui/Toast";
import { getApiErrorMessage } from "../../services/api";
import { calendarService } from "../../services/calendarService";

const OFFICIAL_TRAINING = {
  time: "17:30 às 19:00",
  location: "Jerusalém",
  dependency: "Quadra - CREC",
  modality: "Voleibol",
};

// Datas bloqueadas manualmente (base fixa, complementadas pelas do banco)
const STATIC_MANUAL_BLOCKED = new Set(["2026-05-30", "2026-06-20", "2026-09-26"]);

function addUTCDays(date: Date, days: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

function getEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function getAutoBlockedSaturdays(year: number): Set<string> {
  const blocked = new Set<string>();
  const easter = getEaster(year);
  const goodFriday = addUTCDays(easter, -2);
  blocked.add(toDateKey(addUTCDays(goodFriday, 1)));

  const fixedHolidays = [
    new Date(Date.UTC(year, 0, 1)),
    new Date(Date.UTC(year, 3, 21)),
    new Date(Date.UTC(year, 4, 1)),
    new Date(Date.UTC(year, 8, 7)),
    new Date(Date.UTC(year, 9, 12)),
    new Date(Date.UTC(year, 10, 2)),
    new Date(Date.UTC(year, 10, 15)),
    new Date(Date.UTC(year, 11, 25)),
  ];

  for (const holiday of fixedHolidays) {
    if (holiday.getUTCDay() === 5) {
      blocked.add(toDateKey(addUTCDays(holiday, 1)));
    }
  }

  return blocked;
}

function buildStaticBlockedDates(): Set<string> {
  const all = new Set(STATIC_MANUAL_BLOCKED);
  for (let year = 2024; year <= 2032; year++) {
    getAutoBlockedSaturdays(year).forEach((d) => all.add(d));
  }
  return all;
}

const STATIC_BLOCKED_DATES = buildStaticBlockedDates();

const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const INFO_CARDS: Array<{ label: string; value: string; icon: LucideIcon }> = [
  { label: "Horário", value: OFFICIAL_TRAINING.time, icon: Clock },
  { label: "Local", value: OFFICIAL_TRAINING.location, icon: MapPin },
  { label: "Dependência", value: OFFICIAL_TRAINING.dependency, icon: CalendarDays },
  { label: "Modalidade", value: OFFICIAL_TRAINING.modality, icon: CalendarDays },
];

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(date);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function getMonthDays(month: Date) {
  const start = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1));
  const end = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0));
  const days: Array<Date | null> = [];

  for (let index = 0; index < start.getUTCDay(); index += 1) {
    days.push(null);
  }

  for (let day = 1; day <= end.getUTCDate(); day += 1) {
    days.push(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), day)));
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
}

export function TrainingCalendarPage() {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const canEditCalendar = hasPermission(["management:create", "management:update", "gestao"]);

  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dynamicBlockedDates, setDynamicBlockedDates] = useState<Set<string>>(new Set());
  const [isLoadingDates, setIsLoadingDates] = useState(false);
  const [isTogglingDate, setIsTogglingDate] = useState(false);

  const allBlockedDates = useMemo(
    () => new Set([...STATIC_BLOCKED_DATES, ...dynamicBlockedDates]),
    [dynamicBlockedDates],
  );

  const isOfficialTrainingDate = useCallback(
    (date: Date) => {
      const dateKey = toDateKey(date);
      return date.getUTCDay() === 6 && dateKey <= "2026-12-31" && !allBlockedDates.has(dateKey);
    },
    [allBlockedDates],
  );

  const isBlockedDate = useCallback(
    (date: Date) => allBlockedDates.has(toDateKey(date)),
    [allBlockedDates],
  );

  const isDynamicallyBlocked = useCallback(
    (date: Date) => dynamicBlockedDates.has(toDateKey(date)),
    [dynamicBlockedDates],
  );

  const loadDynamicDates = useCallback(async () => {
    setIsLoadingDates(true);
    try {
      const dates = await calendarService.getBlockedDates();
      setDynamicBlockedDates(new Set(dates));
    } catch {
      // silent — fallback to static dates
    } finally {
      setIsLoadingDates(false);
    }
  }, []);

  useEffect(() => {
    loadDynamicDates();
  }, [loadDynamicDates]);

  const days = useMemo(() => getMonthDays(month), [month]);
  const officialDays = days.filter((day): day is Date => Boolean(day && isOfficialTrainingDate(day)));

  function changeMonth(direction: -1 | 1) {
    setMonth((current) => new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + direction, 1)));
  }

  async function handleToggleBlock(date: Date) {
    if (!canEditCalendar) return;
    const dateKey = toDateKey(date);

    // Can only toggle saturdays
    if (date.getUTCDay() !== 6) return;

    setIsTogglingDate(true);
    try {
      const updated = await calendarService.toggleBlockedDate(dateKey);
      setDynamicBlockedDates(new Set(updated));
      const isNowBlocked = updated.includes(dateKey);
      showToast(isNowBlocked ? "Treino bloqueado." : "Bloqueio removido.", "success");
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsTogglingDate(false);
    }
  }

  // Blocked dates to display: only 2026 entries
  const blockedDatesFor2026 = useMemo(
    () => Array.from(allBlockedDates).filter((d) => d.startsWith("2026-")).sort(),
    [allBlockedDates],
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Calendário de Treinos"
        description="Agenda oficial dos treinos Pegasus aos sábados, com bloqueios e informações fixas do local."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {INFO_CARDS.map(({ label, value, icon: Icon }) => (
          <article className="panel p-5" key={label}>
            <div className="flex items-center gap-3">
              <span className="rounded-2xl bg-pegasus-ice p-3 text-pegasus-primary">
                <Icon size={20} />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-500">{label}</p>
                <strong className="text-pegasus-navy">{value}</strong>
              </div>
            </div>
          </article>
        ))}
      </section>

      {canEditCalendar && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2">
            <Lock className="text-amber-600" size={16} />
            <p className="text-sm font-bold text-amber-800">
              Modo Gestão: clique em qualquer sábado para bloquear ou desbloquear o treino.
            </p>
          </div>
        </section>
      )}

      <section className="panel overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-blue-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="text-xl font-black capitalize text-pegasus-navy">{formatMonth(month)}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {officialDays.length} treino(s) oficial(is) neste mês.
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => changeMonth(-1)} variant="secondary">
              <ChevronLeft size={17} />
              Anterior
            </Button>
            <Button onClick={() => changeMonth(1)} variant="secondary">
              Próximo
              <ChevronRight size={17} />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-blue-100 bg-pegasus-surface text-center text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
          {WEEK_DAYS.map((day) => (
            <div className="px-2 py-3" key={day}>
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 bg-white">
          {days.map((day, index) => {
            if (!day) {
              return <div className="min-h-24 border-b border-r border-blue-50 bg-slate-50/60" key={`empty-${index}`} />;
            }

            const official = isOfficialTrainingDate(day);
            const blocked = isBlockedDate(day);
            const isDynBlocked = isDynamicallyBlocked(day);
            const isSaturday = day.getUTCDay() === 6;
            const isEditableDay = canEditCalendar && isSaturday;

            return (
              <button
                className={`min-h-24 border-b border-r border-blue-50 p-2 text-left transition sm:p-3 ${
                  official ? "bg-blue-50 hover:bg-blue-100" : "bg-white"
                } ${blocked ? "bg-rose-50" : ""} ${isEditableDay ? "cursor-pointer hover:ring-2 hover:ring-amber-400" : ""}`}
                disabled={isTogglingDate || isLoadingDates}
                key={toDateKey(day)}
                onClick={() => {
                  if (isEditableDay) {
                    handleToggleBlock(day);
                  } else if (official) {
                    setSelectedDate(day);
                  }
                }}
                type="button"
              >
                <span className="text-sm font-black text-pegasus-navy">{day.getUTCDate()}</span>
                {official ? (
                  <span className="mt-2 block rounded-xl bg-pegasus-primary px-2 py-1 text-xs font-bold text-white">
                    Treino
                  </span>
                ) : null}
                {blocked ? (
                  <span className="mt-2 block rounded-xl bg-rose-100 px-2 py-1 text-xs font-bold text-rose-700">
                    Bloqueado
                  </span>
                ) : null}
                {isEditableDay && !blocked ? (
                  <span className="mt-1 flex items-center gap-1 text-[10px] font-bold text-amber-600 opacity-60">
                    <LockOpen size={10} />
                    bloquear
                  </span>
                ) : null}
                {isEditableDay && isDynBlocked ? (
                  <span className="mt-1 flex items-center gap-1 text-[10px] font-bold text-green-700 opacity-60">
                    <LockOpen size={10} />
                    desbloquear
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel p-5">
        <p className="text-sm font-bold text-pegasus-navy">Exceções bloqueadas em 2026</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {blockedDatesFor2026.length > 0 ? blockedDatesFor2026.map((date) => (
            <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700" key={date}>
              {new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${date}T00:00:00.000Z`))}
            </span>
          )) : (
            <p className="text-sm text-slate-500">Nenhuma exceção em 2026.</p>
          )}
        </div>
      </section>

      <Modal
        isOpen={Boolean(selectedDate)}
        onClose={() => setSelectedDate(null)}
        title={selectedDate ? `Treino oficial - ${formatDate(selectedDate)}` : "Treino oficial"}
      >
        {selectedDate ? (
          <div className="space-y-4 text-sm leading-6 text-slate-600">
            <p><strong className="text-pegasus-navy">Data:</strong> {formatDate(selectedDate)}</p>
            <p><strong className="text-pegasus-navy">Horário:</strong> {OFFICIAL_TRAINING.time}</p>
            <p><strong className="text-pegasus-navy">Local:</strong> {OFFICIAL_TRAINING.location}</p>
            <p><strong className="text-pegasus-navy">Dependência:</strong> {OFFICIAL_TRAINING.dependency}</p>
            <p><strong className="text-pegasus-navy">Modalidade:</strong> {OFFICIAL_TRAINING.modality}</p>
            <p><strong className="text-pegasus-navy">Observações:</strong> Treino oficial Pegasus aos sábados. Verifique comunicados internos em caso de feriados ou ajustes operacionais.</p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
