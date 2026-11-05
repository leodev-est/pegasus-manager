import { CalendarDays, ChevronLeft, ChevronRight, Clock, Plus, Trophy } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { avatarClass } from "../../components/kanban/cardMeta";
import { PageHeader } from "../../components/ui/PageHeader";
import { Skeleton } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";
import { getApiErrorMessage } from "../../services/api";
import { eventService, type ClubEvent } from "../../services/eventService";
import { marketingService, type MarketingTask } from "../../services/marketingService";
import { MARKETING_COLUMNS, MARKETING_FORMATS, normalizeLegacyTask } from "./marketingConfig";

/**
 * Calendário de conteúdo: lê os cards do Kanban de marketing (não tem tabela própria).
 * Cada card cai no dia em que será publicado — o agendamento, ou o prazo enquanto não há.
 */

type View = "semana" | "mes";

const WEEKDAYS = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];
const VIEW_KEY = "pegasus:marketing-calendar:view";
const statusLabel = new Map(MARKETING_COLUMNS.map((column) => [column.value, column.label]));
const formatByValue = new Map(MARKETING_FORMATS.map((format) => [format.value, format]));

function keyOf(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function fromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(key: string, days: number) {
  const date = fromKey(key);
  date.setDate(date.getDate() + days);
  return keyOf(date);
}

function mondayOf(key: string) {
  const date = fromKey(key);
  return addDays(key, -((date.getDay() + 6) % 7));
}

/** Publication day of a card in São Paulo time: scheduled date first, else the due date. */
function publicationDay(task: MarketingTask) {
  if (task.scheduledAt) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(task.scheduledAt));
  }
  return task.dueDate ? task.dueDate.slice(0, 10) : null;
}

function scheduledTime(task: MarketingTask) {
  if (!task.scheduledAt) return null;
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(
    new Date(task.scheduledAt),
  );
}

function readView(): View {
  try {
    return window.localStorage.getItem(VIEW_KEY) === "mes" ? "mes" : "semana";
  } catch {
    return "semana";
  }
}

const statusTone: Record<string, string> = {
  ideas: "bg-stone-100 text-stone-600 dark:bg-slate-700 dark:text-slate-300",
  production: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  review: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  scheduled: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  published: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
};

function CardChip({ task, compact = false, onOpen }: { task: MarketingTask; compact?: boolean; onOpen: () => void }) {
  const format = task.format ? formatByValue.get(task.format) : undefined;
  const time = scheduledTime(task);
  return (
    <button
      className={`relative block w-full overflow-hidden rounded-md border border-stone-200 bg-white text-left transition hover:-translate-y-px hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-pegasus-sky dark:border-slate-700 dark:bg-slate-800 ${
        compact ? "py-0.5 pl-2 pr-1" : "p-2 pl-2.5"
      }`}
      onClick={onOpen}
      title={`${task.title} · ${statusLabel.get(task.status) ?? task.status}`}
      type="button"
    >
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${format?.stripClass ?? "bg-stone-200 dark:bg-slate-600"}`} />
      <span className={`block truncate font-bold text-pegasus-navy ${compact ? "text-[11px]" : "text-xs"}`}>{task.title}</span>
      {!compact ? (
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${statusTone[task.status] ?? statusTone.ideas}`}>
            {statusLabel.get(task.status) ?? task.status}
          </span>
          {time ? (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300">
              <Clock aria-hidden="true" size={10} />
              {time}
            </span>
          ) : null}
          <span className="ml-auto flex -space-x-1">
            {task.assignedTo.slice(0, 3).map((name) => (
              <span
                className={`grid h-4 w-4 place-items-center rounded-full border border-white text-[8px] font-bold dark:border-slate-800 ${avatarClass(name)}`}
                key={name}
                title={name}
              >
                {name.slice(0, 1).toUpperCase()}
              </span>
            ))}
          </span>
        </span>
      ) : null}
    </button>
  );
}

function DayAdd({ dayKey, onCreate }: { dayKey: string; onCreate: (title: string, day: string) => Promise<boolean> }) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        aria-label={`Criar card para ${fromKey(dayKey).toLocaleDateString("pt-BR")}`}
        className="grid h-6 w-6 place-items-center rounded-md text-stone-400 transition hover:bg-stone-100 hover:text-pegasus-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-pegasus-sky dark:hover:bg-slate-700"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <Plus aria-hidden="true" size={14} />
      </button>
    );
  }

  return (
    <form
      className="mt-1"
      onSubmit={async (event) => {
        event.preventDefault();
        const value = title.trim();
        if (!value) return;
        setTitle("");
        const created = await onCreate(value, dayKey);
        if (!created) setTitle(value);
        inputRef.current?.focus();
      }}
    >
      <input
        aria-label="Título do card"
        className="h-8 w-full rounded-md border border-dashed border-stone-300 bg-white px-2 text-xs focus:border-pegasus-sky focus:outline-none dark:border-slate-600 dark:bg-slate-800"
        onBlur={() => {
          if (!title.trim()) setIsOpen(false);
        }}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setIsOpen(false);
        }}
        placeholder="Título e Enter"
        ref={inputRef}
        value={title}
      />
    </form>
  );
}

export function ContentCalendarPage() {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const canCreate = hasPermission(["marketing:create"]);
  const [view, setView] = useState<View>(readView);
  const [anchor, setAnchor] = useState(() => keyOf(new Date()));
  const [tasks, setTasks] = useState<MarketingTask[]>([]);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const today = keyOf(new Date());

  const load = useCallback(async () => {
    try {
      // Archived cards included: the calendar is also the record of what went out.
      const [taskData, eventData] = await Promise.all([
        marketingService.getTasks({ includeArchived: true }),
        eventService.getAll().catch(() => [] as ClubEvent[]),
      ]);
      setTasks(taskData.map(normalizeLegacyTask));
      setEvents(eventData);
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    try {
      window.localStorage.setItem(VIEW_KEY, view);
    } catch {
      // Storage blocked: the view just isn't remembered.
    }
  }, [view]);

  const days = useMemo(() => {
    if (view === "semana") {
      const start = mondayOf(anchor);
      return Array.from({ length: 7 }, (_, index) => addDays(start, index));
    }
    const first = fromKey(anchor);
    first.setDate(1);
    const start = mondayOf(keyOf(first));
    const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
    const end = addDays(mondayOf(keyOf(last)), 6);
    const list: string[] = [];
    for (let key = start; key <= end; key = addDays(key, 1)) list.push(key);
    return list;
  }, [anchor, view]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, MarketingTask[]>();
    for (const task of tasks) {
      const day = publicationDay(task);
      if (!day) continue;
      map.set(day, [...(map.get(day) ?? []), task]);
    }
    return map;
  }, [tasks]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, ClubEvent[]>();
    for (const event of events) {
      const day = event.date.slice(0, 10);
      map.set(day, [...(map.get(day) ?? []), event]);
    }
    return map;
  }, [events]);

  const undated = tasks.filter((task) => !publicationDay(task) && !task.archivedAt && task.status !== "published").length;
  const monthOfAnchor = fromKey(anchor).getMonth();

  const rawTitle =
    view === "semana"
      ? (() => {
          const fmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
          return `${fmt.format(fromKey(days[0]))} – ${fmt.format(fromKey(days[6]))}`.replace(/\./g, "");
        })()
      : new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(fromKey(anchor));
  // "novembro de 2026" → "Novembro de 2026" (CSS capitalize would also capitalize "de").
  const title = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);

  function shift(direction: -1 | 1) {
    if (view === "semana") {
      setAnchor((key) => addDays(key, 7 * direction));
    } else {
      const date = fromKey(anchor);
      setAnchor(keyOf(new Date(date.getFullYear(), date.getMonth() + direction, 1)));
    }
  }

  function openCard(task: MarketingTask) {
    navigate(`/app/marketing?card=${encodeURIComponent(task.id)}`);
  }

  async function createOnDay(cardTitle: string, day: string) {
    try {
      const created = await marketingService.createTask({
        title: cardTitle,
        status: "ideas",
        dueDate: day,
        area: "marketing",
      });
      setTasks((current) => [...current, normalizeLegacyTask(created)]);
      return true;
    } catch (error) {
      showToast(`Não foi possível criar. ${getApiErrorMessage(error)}`, "error");
      return false;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendário de Conteúdo"
        description="Os cards do Kanban de marketing no dia em que vão ao ar. Clique num card para abri-lo."
      />

      <section className="panel flex flex-wrap items-center gap-3 p-3 sm:p-4">
        <div className="flex items-center gap-1">
          <button
            aria-label={view === "semana" ? "Semana anterior" : "Mês anterior"}
            className="grid h-9 w-9 place-items-center rounded-md border border-stone-200 text-slate-600 hover:bg-pegasus-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-pegasus-sky dark:border-slate-700"
            onClick={() => shift(-1)}
            type="button"
          >
            <ChevronLeft aria-hidden="true" size={17} />
          </button>
          <button
            className="h-9 rounded-md border border-stone-200 px-3 text-sm font-bold text-slate-600 hover:bg-pegasus-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-pegasus-sky dark:border-slate-700"
            onClick={() => setAnchor(today)}
            type="button"
          >
            Hoje
          </button>
          <button
            aria-label={view === "semana" ? "Próxima semana" : "Próximo mês"}
            className="grid h-9 w-9 place-items-center rounded-md border border-stone-200 text-slate-600 hover:bg-pegasus-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-pegasus-sky dark:border-slate-700"
            onClick={() => shift(1)}
            type="button"
          >
            <ChevronRight aria-hidden="true" size={17} />
          </button>
        </div>
        <h2 aria-live="polite" className="text-lg font-black text-pegasus-navy">
          {title}
        </h2>
        <div className="ml-auto flex rounded-lg border border-stone-200 bg-pegasus-surface p-1 dark:border-slate-700" role="group" aria-label="Visão">
          {(["semana", "mes"] as const).map((option) => (
            <button
              aria-pressed={view === option}
              className={`rounded-md px-3 py-1 text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-pegasus-sky ${
                view === option ? "bg-white text-pegasus-primary shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 hover:text-pegasus-primary"
              }`}
              key={option}
              onClick={() => setView(option)}
              type="button"
            >
              {option === "semana" ? "Semana" : "Mês"}
            </button>
          ))}
        </div>
        {undated > 0 ? (
          <p className="w-full text-xs text-slate-500">
            {undated === 1 ? "1 card ainda não tem data" : `${undated} cards ainda não têm data`} e não aparece aqui.
          </p>
        ) : null}
      </section>

      {isLoading ? (
        <div aria-busy="true" className="grid gap-3 md:grid-cols-7">
          <span className="sr-only">Carregando calendário</span>
          {Array.from({ length: 7 }).map((_, index) => (
            <div className="panel space-y-2 p-3" key={index}>
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-12 w-full" />
              {index % 2 === 0 ? <Skeleton className="h-12 w-full" /> : null}
            </div>
          ))}
        </div>
      ) : view === "semana" ? (
        <div className="grid gap-3 md:grid-cols-7">
          {days.map((day, index) => {
            const dayTasks = tasksByDay.get(day) ?? [];
            const dayEvents = eventsByDay.get(day) ?? [];
            const isToday = day === today;
            return (
              <section
                aria-label={fromKey(day).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
                className={`panel p-2.5 md:min-h-[9rem] ${isToday ? "ring-2 ring-pegasus-sky" : ""}`}
                key={day}
              >
                <header className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-black text-slate-500">
                    {WEEKDAYS[index]}{" "}
                    <span className={isToday ? "text-pegasus-primary dark:text-emerald-400" : "text-pegasus-navy"}>
                      {fromKey(day).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                    </span>
                  </p>
                  {canCreate && day >= today ? <DayAdd dayKey={day} onCreate={createOnDay} /> : null}
                </header>
                <div className="space-y-1.5">
                  {dayEvents.map((event) => (
                    <p
                      className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                      key={event.id}
                      title={event.location ? `${event.name} · ${event.location}` : event.name}
                    >
                      <Trophy aria-hidden="true" className="shrink-0" size={11} />
                      <span className="truncate">{event.name}</span>
                    </p>
                  ))}
                  {dayTasks.map((task) => (
                    <CardChip key={task.id} task={task} onOpen={() => openCard(task)} />
                  ))}
                  {dayTasks.length === 0 && dayEvents.length === 0 ? (
                    <p className="text-[11px] text-slate-300 dark:text-slate-600">Nada planejado.</p>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <div className="grid grid-cols-7 border-b border-stone-200 bg-pegasus-surface text-center text-[11px] font-black text-slate-500 dark:border-slate-700">
            {WEEKDAYS.map((weekday) => (
              <span className="py-2" key={weekday}>
                {weekday}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const dayTasks = tasksByDay.get(day) ?? [];
              const dayEvents = eventsByDay.get(day) ?? [];
              const inMonth = fromKey(day).getMonth() === monthOfAnchor;
              const isToday = day === today;
              const visible = dayTasks.slice(0, 3);
              return (
                <div
                  className={`min-h-[5.5rem] border-b border-r border-stone-100 p-1 sm:min-h-[7.5rem] sm:p-1.5 dark:border-slate-800 ${
                    inMonth ? "" : "bg-stone-50/70 dark:bg-slate-900/40"
                  }`}
                  key={day}
                >
                  <button
                    aria-label={`Ver a semana de ${fromKey(day).toLocaleDateString("pt-BR")}`}
                    className={`mb-1 grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-pegasus-sky ${
                      isToday
                        ? "bg-pegasus-primary text-white dark:bg-emerald-500"
                        : inMonth
                          ? "text-pegasus-navy hover:bg-stone-100 dark:hover:bg-slate-700"
                          : "text-slate-400"
                    }`}
                    onClick={() => {
                      setAnchor(day);
                      setView("semana");
                    }}
                    type="button"
                  >
                    {fromKey(day).getDate()}
                  </button>
                  {/* Small screens: dots; larger: titles. */}
                  <div className="flex flex-wrap gap-0.5 sm:hidden">
                    {dayEvents.map((event) => (
                      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber-400" key={event.id} />
                    ))}
                    {dayTasks.map((task) => (
                      <span
                        aria-hidden="true"
                        className={`h-1.5 w-1.5 rounded-full ${task.format ? formatByValue.get(task.format)?.stripClass : "bg-stone-300"}`}
                        key={task.id}
                      />
                    ))}
                    {dayTasks.length + dayEvents.length > 0 ? (
                      <span className="sr-only">
                        {dayTasks.length} cards e {dayEvents.length} eventos
                      </span>
                    ) : null}
                  </div>
                  <div className="hidden space-y-1 sm:block">
                    {dayEvents.slice(0, 1).map((event) => (
                      <p className="flex items-center gap-1 truncate text-[10px] font-bold text-amber-700 dark:text-amber-300" key={event.id} title={event.name}>
                        <Trophy aria-hidden="true" className="shrink-0" size={10} />
                        <span className="truncate">{event.name}</span>
                      </p>
                    ))}
                    {visible.map((task) => (
                      <CardChip compact key={task.id} task={task} onOpen={() => openCard(task)} />
                    ))}
                    {dayTasks.length > visible.length ? (
                      <button
                        className="text-[10px] font-bold text-slate-500 hover:text-pegasus-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-pegasus-sky"
                        onClick={() => {
                          setAnchor(day);
                          setView("semana");
                        }}
                        type="button"
                      >
                        +{dayTasks.length - visible.length} mais
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="flex items-center gap-1.5 text-xs text-slate-400">
        <CalendarDays aria-hidden="true" size={13} />
        Itens da antiga Pauta de Conteúdo estão no Kanban com a etiqueta “Pauta”.
      </p>
    </div>
  );
}
