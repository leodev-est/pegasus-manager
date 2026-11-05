import { Archive, Search, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { sameName } from "../../components/kanban/cardMeta";
import type { MarketingTask } from "../../services/marketingService";
import { MARKETING_CHANNELS, MARKETING_FORMATS } from "./marketingConfig";

export type MarketingFilterState = {
  mine: boolean;
  overdue: boolean;
  thisWeek: boolean;
  format: string;
  channel: string;
  person: string;
  search: string;
  showArchived: boolean;
};

const STORAGE_KEY = "pegasus:marketing-kanban:filters:v1";

export const emptyFilters: MarketingFilterState = {
  mine: false,
  overdue: false,
  thisWeek: false,
  format: "",
  channel: "",
  person: "",
  search: "",
  showArchived: false,
};

function readStoredFilters(): MarketingFilterState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyFilters;
    const parsed = JSON.parse(raw) as Partial<MarketingFilterState>;
    return { ...emptyFilters, ...parsed };
  } catch {
    return emptyFilters;
  }
}

/** Filters survive reloads (per browser). Storage may be blocked; then they just don't persist. */
export function usePersistedFilters() {
  const [filters, setFilters] = useState<MarketingFilterState>(readStoredFilters);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch {
      // Private mode / blocked storage: keep working without persistence.
    }
  }, [filters]);

  return [filters, setFilters] as const;
}

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Monday..Sunday of the current week, as "YYYY-MM-DD". */
function currentWeekRange() {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const key = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return [key(monday), key(sunday)] as const;
}

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function applyMarketingFilters(tasks: MarketingTask[], filters: MarketingFilterState, me?: string) {
  const today = todayKey();
  const [weekStart, weekEnd] = currentWeekRange();
  const query = normalizeText(filters.search.trim());

  return tasks.filter((task) => {
    const due = task.dueDate?.slice(0, 10) ?? null;
    const finished = task.status === "scheduled" || task.status === "published";

    if (filters.mine && !task.assignedTo.some((name) => sameName(name, me))) return false;
    if (filters.overdue && (!due || finished || due >= today)) return false;
    if (filters.thisWeek && (!due || due < weekStart || due > weekEnd)) return false;
    if (filters.format && (task.format ?? "") !== filters.format) return false;
    if (filters.channel && (task.channel ?? "") !== filters.channel) return false;
    if (filters.person && !task.assignedTo.some((name) => sameName(name, filters.person))) return false;
    if (query) {
      const haystack = normalizeText(
        [task.title, task.description ?? "", ...task.labels, ...task.assignedTo].join(" "),
      );
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export function countActiveFilters(filters: MarketingFilterState) {
  return [
    filters.mine,
    filters.overdue,
    filters.thisWeek,
    Boolean(filters.format),
    Boolean(filters.channel),
    Boolean(filters.person),
    Boolean(filters.search.trim()),
  ].filter(Boolean).length;
}

function Chip({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      aria-pressed={active}
      className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pegasus-sky ${
        active
          ? "border-pegasus-primary bg-pegasus-primary text-white dark:border-slate-200 dark:bg-slate-200 dark:text-slate-900"
          : "border-stone-200 bg-white text-slate-600 hover:border-stone-300 hover:bg-pegasus-surface dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

const selectClass =
  "h-8 rounded-full border border-stone-200 bg-white px-3 text-xs font-bold text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-pegasus-sky dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";

export function MarketingFilters({
  filters,
  people,
  shown,
  total,
  onChange,
}: {
  filters: MarketingFilterState;
  people: string[];
  shown: number;
  total: number;
  onChange: (next: MarketingFilterState) => void;
}) {
  const set = (patch: Partial<MarketingFilterState>) => onChange({ ...filters, ...patch });
  const active = countActiveFilters(filters);

  return (
    <section aria-label="Filtros do quadro" className="panel space-y-3 p-3 sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative block lg:w-72">
          <span className="sr-only">Buscar cards</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={15} />
          <input
            aria-keyshortcuts="/"
            className="h-9 w-full rounded-full border border-stone-200 bg-white pl-9 pr-9 text-sm placeholder:text-stone-400 focus:border-pegasus-sky focus:outline-none focus:ring-2 focus:ring-pegasus-sky/20 dark:border-slate-700 dark:bg-slate-800"
            data-kanban-search
            onChange={(event) => set({ search: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.currentTarget.blur();
                if (filters.search) set({ search: "" });
              }
            }}
            placeholder="Buscar por título, etiqueta ou pessoa"
            type="search"
            value={filters.search}
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-stone-200 px-1.5 text-[10px] font-bold text-stone-400 sm:block dark:border-slate-600">
            /
          </kbd>
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <Chip active={filters.mine} onClick={() => set({ mine: !filters.mine })}>
            Meus
          </Chip>
          <Chip active={filters.overdue} onClick={() => set({ overdue: !filters.overdue })}>
            Atrasados
          </Chip>
          <Chip active={filters.thisWeek} onClick={() => set({ thisWeek: !filters.thisWeek })}>
            Esta semana
          </Chip>
          <select
            aria-label="Formato"
            className={selectClass}
            onChange={(event) => set({ format: event.target.value })}
            value={filters.format}
          >
            <option value="">Todos os formatos</option>
            {MARKETING_FORMATS.map((format) => (
              <option key={format.value} value={format.value}>
                {format.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Canal"
            className={selectClass}
            onChange={(event) => set({ channel: event.target.value })}
            value={filters.channel}
          >
            <option value="">Todos os canais</option>
            {MARKETING_CHANNELS.map((channel) => (
              <option key={channel.value} value={channel.value}>
                {channel.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Pessoa"
            className={selectClass}
            onChange={(event) => set({ person: event.target.value })}
            value={filters.person}
          >
            <option value="">Todas as pessoas</option>
            {people.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-3">
          <span aria-live="polite">
            {active > 0 ? `${shown} de ${total} cards` : `${total} ${total === 1 ? "card" : "cards"}`}
          </span>
          {active > 0 ? (
            <button
              className="inline-flex items-center gap-1 font-bold text-pegasus-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-pegasus-sky dark:text-slate-200"
              onClick={() => onChange({ ...emptyFilters, showArchived: filters.showArchived })}
              type="button"
            >
              <X aria-hidden="true" size={12} />
              Limpar filtros
            </button>
          ) : null}
          <label className="inline-flex cursor-pointer items-center gap-1.5 font-semibold">
            <input
              checked={filters.showArchived}
              className="h-3.5 w-3.5 rounded border-stone-300 accent-emerald-500"
              onChange={(event) => set({ showArchived: event.target.checked })}
              type="checkbox"
            />
            <Archive aria-hidden="true" size={12} />
            Mostrar arquivados
          </label>
        </div>
        <span className="hidden sm:inline">
          Atalhos: <kbd className="font-bold">N</kbd> novo card · <kbd className="font-bold">/</kbd> buscar ·{" "}
          <kbd className="font-bold">Esc</kbd> fechar
        </span>
      </div>
    </section>
  );
}
