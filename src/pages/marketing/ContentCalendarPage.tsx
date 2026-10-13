import { ChevronLeft, ChevronRight, Link2, Plus, Trophy } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { useToast } from "../../components/ui/Toast";
import { getApiErrorMessage } from "../../services/api";
import { eventService, type ClubEvent } from "../../services/eventService";
import { marketingService, type MarketingTask } from "../../services/marketingService";
import { userService } from "../../services/userService";
import {
  FILTER_LABEL,
  FORMAT_SHORT,
  STEP_LABEL,
  isMine,
  matchesPautaFilter,
  nextStep,
  pipelineFor,
  stepsHandledBy,
  type PautaFilter,
} from "../../utils/contentPipeline";

/**
 * Calendário de Marketing: visão de mês/semana sobre os cards do Kanban (área marketing) que
 * têm prazo, mais os Eventos do time. Não edita nada aqui — clicar num card abre o Kanban
 * (/app/marketing?task=ID), que já sabe abrir o modal de detalhes direto nesse card.
 * (Era uma tela separada, "Pauta de Conteúdo" com seu próprio modelo; foi unificada no Kanban.)
 */

const WEEKDAYS: Array<{ label: string; short: string }> = [
  { label: "Segunda", short: "SEG" },
  { label: "Terça", short: "TER" },
  { label: "Quarta", short: "QUA" },
  { label: "Quinta", short: "QUI" },
  { label: "Sexta", short: "SEX" },
  { label: "Sábado", short: "SÁB" },
  { label: "Domingo", short: "DOM" },
];

const FILTERS: PautaFilter[] = ["todos", "meus", "fila", "vindo"];

type View = "semana" | "mes";

/** Data de hoje no fuso de Brasília (evita "virar o dia" às 21h por causa do UTC). */
function todayKey() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

function addDaysToKey(dateKey: string, days: number) {
  const d = new Date(`${dateKey}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function mondayOf(dateKey: string) {
  const d = new Date(`${dateKey}T12:00:00.000Z`);
  const weekday = d.getUTCDay();
  return addDaysToKey(dateKey, weekday === 0 ? -6 : 1 - weekday);
}

function formatDayLabel(dateKey: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(
    new Date(`${dateKey}T12:00:00.000Z`),
  );
}

function formatRangeLabel(weekDates: string[]) {
  if (weekDates.length === 0) return "";
  const first = new Date(`${weekDates[0]}T12:00:00.000Z`);
  const last = new Date(`${weekDates[6]}T12:00:00.000Z`);
  const fmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
  const year = new Intl.DateTimeFormat("pt-BR", { year: "numeric", timeZone: "UTC" }).format(last);
  return `${fmt.format(first)} – ${fmt.format(last)} de ${year}`;
}

function monthLabel(monthKey: string) {
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${monthKey}-15T12:00:00.000Z`),
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function shiftMonth(monthKey: string, delta: number) {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 15));
  return d.toISOString().slice(0, 7);
}

/** Dias exibidos no grid do mês: começa na segunda da semana do dia 1 e vai até completar semanas inteiras. */
function monthGridDates(monthKey: string) {
  const first = `${monthKey}-01`;
  const start = mondayOf(first);
  const [y, m] = monthKey.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  const end = addDaysToKey(mondayOf(lastDay), 6);
  const dates: string[] = [];
  for (let d = start; d <= end; d = addDaysToKey(d, 1)) dates.push(d);
  return dates;
}

type MarketingUser = { name: string; functions: string[] };

export function ContentCalendarPage() {
  const { hasPermission, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const canCreate = hasPermission(["marketing:create"]);

  const [view, setView] = useState<View>("semana");
  const [filter, setFilter] = useState<PautaFilter>("todos");
  const [person, setPerson] = useState("todos");
  const [anchorDate, setAnchorDate] = useState(todayKey);
  const [monthKey, setMonthKey] = useState(() => todayKey().slice(0, 7));
  const [tasks, setTasks] = useState<MarketingTask[]>([]);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [marketingUsers, setMarketingUsers] = useState<MarketingUser[]>([]);

  const [quickAddDate, setQuickAddDate] = useState<string | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const myFunctions = user?.marketingFunctions ?? [];
  const hasStageFunction = stepsHandledBy(myFunctions).length > 0;
  const me = useMemo(() => ({ name: user?.name, functions: myFunctions }), [user?.name, myFunctions]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [taskData, eventData] = await Promise.all([marketingService.getTasks(), eventService.getAll()]);
      setTasks(taskData.filter((t) => t.dueDate));
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
    Promise.all([userService.getUsersByRole("Marketing"), userService.getUsersByRole("ChefeMarketing")])
      .then(([marketing, chefe]) => {
        const seen = new Set<string>();
        const merged = [...marketing, ...chefe].filter((u) => (seen.has(u.id) ? false : (seen.add(u.id), true)));
        setMarketingUsers(merged.map((u) => ({ name: u.name, functions: u.marketingFunctions ?? [] })));
      })
      .catch(() => setMarketingUsers([]));
  }, []);

  const personOptions = useMemo(() => {
    const names = new Set<string>(marketingUsers.map((u) => u.name));
    for (const task of tasks) task.assignedTo.forEach((n) => names.add(n));
    return [{ label: "Todas as pessoas", value: "todos" }, ...Array.from(names).sort().map((n) => ({ label: n, value: n }))];
  }, [marketingUsers, tasks]);

  function matchesFilter(task: MarketingTask): boolean {
    if (filter === "todos") return true;
    if (filter === "meus") return isMine(task, user?.name);
    // "fila"/"vindo" só fazem sentido pra cards com esteira de produção (contentFormat definido).
    if (!task.contentFormat) return false;
    return matchesPautaFilter(
      { assignedTo: task.assignedTo, format: task.contentFormat, status: task.contentStep ?? "referencia" },
      filter,
      me,
    );
  }

  const visibleTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (!matchesFilter(task)) return false;
        if (person !== "todos" && !task.assignedTo.some((n) => n.toLowerCase() === person.toLowerCase())) return false;
        return true;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, filter, person, me],
  );

  const visibleEvents = filter === "todos" && person === "todos" ? events : [];

  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysToKey(mondayOf(anchorDate), i)), [anchorDate]);
  const gridDates = useMemo(() => monthGridDates(monthKey), [monthKey]);

  function groupBy<T>(list: T[], dateOf: (item: T) => string | null) {
    const map: Record<string, T[]> = {};
    for (const entry of list) {
      const key = dateOf(entry);
      if (key) (map[key.slice(0, 10)] ??= []).push(entry);
    }
    return map;
  }
  const tasksByDate = useMemo(() => groupBy(visibleTasks, (t) => t.dueDate), [visibleTasks]);
  const eventsByDate = useMemo(() => groupBy(visibleEvents, (e) => e.date), [visibleEvents]);

  function openQuickAdd(date: string) {
    setQuickAddDate(date);
    setQuickAddTitle("");
  }

  async function submitQuickAdd(event: React.FormEvent) {
    event.preventDefault();
    const title = quickAddTitle.trim();
    if (!title || !quickAddDate) return;
    setIsSaving(true);
    try {
      const created = await marketingService.createTask({ title, dueDate: quickAddDate, area: "marketing" });
      showToast("Card criado. Abra o Kanban para completar os detalhes.", "success");
      setQuickAddDate(null);
      await load();
      navigate(`/app/marketing?task=${created.id}`);
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsSaving(false);
    }
  }

  function renderTaskCard(task: MarketingTask, compact = false) {
    const mine = isMine(task, user?.name);
    const linkCount = task.links?.length ?? 0;
    const pipeline = task.contentFormat ? pipelineFor(task.contentFormat) : null;
    const currentIdx = pipeline ? pipeline.indexOf(task.contentStep ?? "referencia") : -1;
    const next = task.contentFormat ? nextStep(task.contentFormat, task.contentStep ?? "referencia") : null;

    return (
      <button
        className={`card-interactive w-full cursor-pointer rounded-lg border bg-white p-2 text-left dark:bg-slate-800 ${
          mine ? "border-pegasus-primary/60 ring-1 ring-pegasus-primary/30" : "border-stone-200 dark:border-slate-700"
        }`}
        key={task.id}
        onClick={() => navigate(`/app/marketing?task=${task.id}`)}
        type="button"
      >
        <div className="flex items-start justify-between gap-1">
          <p className="truncate text-xs font-bold text-pegasus-navy">{task.title}</p>
          {linkCount > 0 ? (
            <span className="flex shrink-0 items-center gap-0.5 text-[10px] font-bold text-slate-400" title={`${linkCount} link(s)`}>
              <Link2 size={10} />
              {linkCount}
            </span>
          ) : null}
        </div>
        {!compact && pipeline ? (
          <div className="mt-1.5 flex gap-0.5">
            {pipeline.map((step, stepIdx) => (
              <span
                className={`h-1.5 flex-1 rounded-full ${stepIdx <= currentIdx ? "bg-emerald-500" : "bg-stone-200 dark:bg-slate-700"}`}
                key={step}
                title={STEP_LABEL[step]}
              />
            ))}
          </div>
        ) : null}
        <p className="mt-1 text-[10px] font-semibold text-slate-400">
          {task.contentFormat ? (
            <>
              {FORMAT_SHORT[task.contentFormat]} · {STEP_LABEL[task.contentStep ?? "referencia"]}
              {next ? <span className="text-amber-600"> → {STEP_LABEL[next]}</span> : <span className="text-emerald-600"> ✓</span>}
            </>
          ) : (
            "Tarefa"
          )}
        </p>
        {task.assignedTo.length > 0 ? (
          <p className="mt-0.5 truncate text-[10px] text-slate-400">{task.assignedTo.join(", ")}</p>
        ) : null}
      </button>
    );
  }

  const today = todayKey();

  return (
    <div className="space-y-6">
      <PageHeader title="Calendário de Marketing" description="Acompanhe os cards do Kanban com prazo e os eventos do time, por semana ou mês." />

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-stone-200 p-0.5">
              {(["semana", "mes"] as const).map((v) => (
                <button
                  className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                    view === v ? "bg-pegasus-primary text-white" : "text-slate-600 hover:bg-pegasus-ice"
                  }`}
                  key={v}
                  onClick={() => setView(v)}
                  type="button"
                >
                  {v === "semana" ? "Semana" : "Mês"}
                </button>
              ))}
            </div>
            <Button
              onClick={() => {
                setAnchorDate(todayKey());
                setMonthKey(todayKey().slice(0, 7));
              }}
              variant="secondary"
              className="h-9 px-3 text-xs"
            >
              Hoje
            </Button>
            <Button
              aria-label="Anterior"
              onClick={() => (view === "semana" ? setAnchorDate((d) => addDaysToKey(d, -7)) : setMonthKey((m) => shiftMonth(m, -1)))}
              variant="secondary"
              className="h-9 w-9 px-0"
            >
              <ChevronLeft size={16} />
            </Button>
            <Button
              aria-label="Próximo"
              onClick={() => (view === "semana" ? setAnchorDate((d) => addDaysToKey(d, 7)) : setMonthKey((m) => shiftMonth(m, 1)))}
              variant="secondary"
              className="h-9 w-9 px-0"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
          <h2 className="text-sm font-bold text-pegasus-navy">{view === "semana" ? formatRangeLabel(weekDates) : monthLabel(monthKey)}</h2>
        </div>

        <div className="flex flex-wrap items-end gap-3 border-b border-stone-100 bg-stone-50/60 p-3">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => {
              const needsFunction = f === "fila" || f === "vindo";
              const disabled = needsFunction && !hasStageFunction;
              return (
                <button
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                    filter === f
                      ? "border-pegasus-primary bg-pegasus-primary text-white"
                      : "border-stone-200 bg-white text-slate-600 hover:border-pegasus-primary hover:text-pegasus-primary"
                  } ${disabled ? "cursor-not-allowed opacity-40 hover:border-stone-200 hover:text-slate-600" : ""}`}
                  disabled={disabled}
                  key={f}
                  onClick={() => setFilter(f)}
                  title={disabled ? "Peça a um administrador para definir sua função no time de marketing." : undefined}
                  type="button"
                >
                  {FILTER_LABEL[f]}
                </button>
              );
            })}
          </div>
          <div className="w-full sm:w-56">
            <Select label="Pessoa" onChange={(event) => setPerson(event.target.value)} options={personOptions} value={person} />
          </div>
          {filter === "fila" ? (
            <p className="text-xs text-slate-500">Cards esperando a sua etapa, de qualquer responsável.</p>
          ) : filter === "vindo" ? (
            <p className="text-xs text-slate-500">Cards que ainda vão chegar na sua etapa.</p>
          ) : null}
        </div>

        {isLoading ? (
          <div className="p-6 text-sm font-bold text-pegasus-primary">Carregando calendário...</div>
        ) : view === "semana" ? (
          <div className="grid grid-cols-1 divide-y divide-stone-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-7">
            {weekDates.map((dateKey, i) => {
              const dayTasks = tasksByDate[dateKey] ?? [];
              const dayEvents = eventsByDate[dateKey] ?? [];
              const isToday = dateKey === today;
              return (
                <div className={`flex min-h-[220px] flex-col p-3 ${isToday ? "bg-pegasus-ice/40" : ""}`} key={dateKey}>
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{WEEKDAYS[i].short}</p>
                      <p className={`text-sm font-black ${isToday ? "text-pegasus-primary" : "text-pegasus-navy"}`}>
                        {formatDayLabel(dateKey)}
                      </p>
                    </div>
                    {canCreate ? (
                      <button
                        aria-label={`Novo card em ${WEEKDAYS[i].label}`}
                        className="grid h-6 w-6 place-items-center rounded-lg text-pegasus-primary hover:bg-pegasus-ice"
                        onClick={() => openQuickAdd(dateKey)}
                        type="button"
                      >
                        <Plus size={15} />
                      </button>
                    ) : null}
                  </div>

                  <div className="space-y-1.5">
                    {dayEvents.map((event) => (
                      <div
                        className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] font-bold text-amber-700"
                        key={event.id}
                        title={event.location ?? undefined}
                      >
                        <Trophy size={11} className="shrink-0" />
                        <span className="truncate">{event.name}</span>
                      </div>
                    ))}

                    {dayTasks.map((task) => renderTaskCard(task))}

                    {dayTasks.length === 0 && dayEvents.length === 0 ? (
                      <p className="text-[11px] text-slate-300">{filter === "todos" && person === "todos" ? "Nada planejado." : "Nada com esse filtro."}</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <>
            {/* Desktop: grade do mês */}
            <div className="hidden md:block">
              <div className="grid grid-cols-7 border-b border-stone-100 bg-stone-50 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
                {WEEKDAYS.map((d) => (
                  <div className="py-2" key={d.short}>
                    {d.short}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {gridDates.map((dateKey) => {
                  const inMonth = dateKey.startsWith(monthKey);
                  const dayTasks = tasksByDate[dateKey] ?? [];
                  const dayEvents = eventsByDate[dateKey] ?? [];
                  const isToday = dateKey === today;
                  return (
                    <div
                      className={`min-h-[120px] border-b border-r border-stone-100 p-1.5 ${inMonth ? "" : "bg-stone-50/70"} ${
                        isToday ? "bg-pegasus-ice/40" : ""
                      }`}
                      key={dateKey}
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className={`text-xs font-black ${isToday ? "text-pegasus-primary" : inMonth ? "text-pegasus-navy" : "text-slate-300"}`}>
                          {Number(dateKey.slice(8, 10))}
                        </span>
                        {canCreate && inMonth ? (
                          <button
                            aria-label={`Novo card em ${formatDayLabel(dateKey)}`}
                            className="grid h-5 w-5 place-items-center rounded text-pegasus-primary opacity-60 hover:bg-pegasus-ice hover:opacity-100"
                            onClick={() => openQuickAdd(dateKey)}
                            type="button"
                          >
                            <Plus size={12} />
                          </button>
                        ) : null}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 1).map((event) => (
                          <button
                            className="flex w-full items-center gap-1 truncate rounded bg-amber-50 px-1.5 py-1 text-left text-[10px] font-bold text-amber-700"
                            key={event.id}
                            onClick={() => navigate("/app/marketing/eventos")}
                            type="button"
                          >
                            <Trophy className="shrink-0" size={10} />
                            <span className="truncate">{event.name}</span>
                          </button>
                        ))}
                        {dayTasks.slice(0, 3).map((task) => renderTaskCard(task, true))}
                        {dayTasks.length > 3 || dayEvents.length > 1 ? (
                          <p className="text-[10px] font-bold text-slate-400">
                            +{Math.max(0, dayTasks.length - 3) + Math.max(0, dayEvents.length - 1)} mais
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Celular: lista só dos dias com algo */}
            <div className="space-y-3 p-3 md:hidden">
              {gridDates
                .filter((d) => d.startsWith(monthKey))
                .filter((d) => (tasksByDate[d]?.length ?? 0) + (eventsByDate[d]?.length ?? 0) > 0)
                .map((dateKey) => (
                  <div key={dateKey}>
                    <p className="mb-1 text-xs font-black text-pegasus-navy">
                      {WEEKDAYS[(new Date(`${dateKey}T12:00:00.000Z`).getUTCDay() + 6) % 7].label} · {formatDayLabel(dateKey)}
                    </p>
                    <div className="space-y-1.5">
                      {(eventsByDate[dateKey] ?? []).map((event) => (
                        <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] font-bold text-amber-700" key={event.id}>
                          <Trophy size={11} />
                          {event.name}
                        </div>
                      ))}
                      {(tasksByDate[dateKey] ?? []).map((task) => renderTaskCard(task))}
                    </div>
                  </div>
                ))}
              {visibleTasks.length + visibleEvents.length === 0 ? <p className="text-sm text-slate-400">Nada neste mês com esse filtro.</p> : null}
            </div>
          </>
        )}
      </section>

      <Modal isOpen={Boolean(quickAddDate)} onClose={() => setQuickAddDate(null)} title="Novo card" description={quickAddDate ? formatDayLabel(quickAddDate) : undefined}>
        <form className="grid gap-4" onSubmit={submitQuickAdd}>
          <Input
            autoFocus
            disabled={isSaving}
            label="Título"
            onChange={(event) => setQuickAddTitle(event.target.value)}
            placeholder="Ex: Vídeo de treino, Reels do jogo..."
            required
            value={quickAddTitle}
          />
          <p className="text-xs text-slate-500">Cria o card no Kanban de Marketing nesse prazo. Formato, responsáveis e checklist você completa lá.</p>
          <div className="flex gap-3">
            <Button disabled={isSaving} type="submit">
              {isSaving ? "Criando..." : "Criar card"}
            </Button>
            <Button disabled={isSaving} onClick={() => setQuickAddDate(null)} type="button" variant="secondary">
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
