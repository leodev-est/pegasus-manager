import {
  closestCenter,
  defaultDropAnimationSideEffects,
  DndContext,
  DragOverlay,
  MouseSensor,
  pointerWithin,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type DropAnimation,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertCircle,
  Check,
  CheckSquare,
  Clock,
  Hourglass,
  Loader2,
  MessageSquare,
  Archive,
  Plus,
  ShieldAlert,
  Tag,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { EmptyState } from "../ui/EmptyState";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { PageHeader } from "../ui/PageHeader";
import { Select } from "../ui/Select";
import { Skeleton } from "../ui/Skeleton";
import { StatusBadge, type StatusTone } from "../ui/StatusBadge";
import { Textarea } from "../ui/Textarea";
import { CardMenu, type CardMenuColumn } from "./CardMenu";
import { TaskActivity, type KanbanHistoryEntry } from "./TaskActivity";
import {
  avatarClass,
  daysSince,
  describeDue,
  describeTimeInColumn,
  extractLinks,
  sameName,
} from "./cardMeta";

export type KanbanComment = {
  id: string;
  text: string;
  author?: string;
  createdAt: string;
};

export type KanbanChecklistItem = {
  id: string;
  text: string;
  done: boolean;
};

export type KanbanTaskBase = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  assignedTo: string[];
  dueDate: string | null;
  priority: "baixa" | "media" | "alta";
  channel?: string | null;
  labels?: string[];
  comments?: KanbanComment[];
  checklist?: KanbanChecklistItem[];
  approvalStatus?: string | null;
  scheduledAt?: string | null;
  format?: string | null;
  stagesDone?: string[];
  /** When the card entered its current column; falls back to updatedAt when missing. */
  statusChangedAt?: string | null;
  /** Hand order inside the column (lower = higher up); null when never reordered. */
  position?: number | null;
  createdAt: string;
  updatedAt: string;
};

type ColumnConfig<TStatus extends string> = {
  label: string;
  value: TStatus;
};

type ChannelOption = {
  label: string;
  value: string;
};

export type KanbanChannelOption = ChannelOption & { icon?: LucideIcon };

export type KanbanStage = { key: string; label: string };

/** Production format: what the card is. Drives the color strip and the sub-stage track. */
export type KanbanFormatOption = {
  value: string;
  label: string;
  icon: LucideIcon;
  /** Background class for the left color strip. */
  stripClass: string;
  /** Classes for the small format chip. */
  chipClass: string;
  /** Whether the "Canal" (platform) field makes sense for this format. */
  showChannel: boolean;
  stages: KanbanStage[];
};

type TaskForm<TStatus extends string> = {
  title: string;
  description: string;
  assignedTo: string[];
  dueDate: string;
  priority: "baixa" | "media" | "alta";
  status: TStatus;
  channel?: string;
  format?: string;
  stagesDone: string[];
  labels: string[];
  comments: KanbanComment[];
  checklist: KanbanChecklistItem[];
};

type AdvancedKanbanProps<TTask extends KanbanTaskBase, TStatus extends string> = {
  title: string;
  description: string;
  icon: LucideIcon;
  columns: Array<ColumnConfig<TStatus>>;
  tasks: TTask[];
  filters?: ReactNode;
  isLoading: boolean;
  isSaving: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  areaLabel: string;
  currentUserName?: string;
  channelOptions?: KanbanChannelOption[];
  /** label is shown in pickers and avatar tooltips (e.g. "Gustavo — Edição"); value is the stored name. */
  responsibleOptions?: ChannelOption[];
  formatOptions?: KanbanFormatOption[];
  /** Column where the format's sub-stage track is shown on the card. */
  stagesColumn?: TStatus;
  /** Days in the same column after which the card is flagged as stalled. */
  staleAfterDays?: Partial<Record<TStatus, number>>;
  savedLabels?: string[];
  minDueDate?: string;
  labelsAsTab?: boolean;
  approvalColumn?: TStatus;
  scheduledColumn?: TStatus;
  canApprove?: boolean;
  emptyStatus: TStatus;
  onCreate: (payload: TaskForm<TStatus>) => Promise<void>;
  onUpdate: (task: TTask, payload: TaskForm<TStatus>) => Promise<void>;
  onDelete: (task: TTask) => Promise<void>;
  /** Should reject when the move fails: the card is shown in the new column right away and goes back on error. */
  onMove: (task: TTask, status: TStatus) => Promise<void>;
  /** Quiet checklist save from the details modal. Falls back to onUpdate when absent. Should reject on failure. */
  onChecklistToggle?: (task: TTask, checklist: KanbanChecklistItem[]) => Promise<void>;
  /** Quiet save of the sub-stages done. Should reject on failure. */
  onStagesToggle?: (task: TTask, stagesDone: string[]) => Promise<void>;
  /** "+" on the column header: creates a card with just a title. Should reject on failure. */
  onQuickCreate?: (title: string, status: TStatus) => Promise<void>;
  /** Quick edits from the card menu (assign to me, due date). Should reject on failure. */
  onQuickUpdate?: (task: TTask, patch: { assignedTo?: string[]; dueDate?: string | null }) => Promise<void>;
  onDuplicate?: (task: TTask) => Promise<void>;
  /**
   * Saves a card's place in its column, between `beforeId` (card above) and `afterId` (card
   * below). When present, cards can be reordered by dragging. Should reject on failure.
   */
  onReorder?: (task: TTask, neighbours: { beforeId: string | null; afterId: string | null }) => Promise<void>;
  /** Comment with @mentions from the details modal. Should reject on failure. */
  onAddComment?: (task: TTask, text: string) => Promise<void>;
  /** Opens this card's details once (e.g. from a link or a notification), then calls onOpenTaskHandled. */
  openTask?: TTask | null;
  onOpenTaskHandled?: () => void;
  /** Who changed what on the card, newest first. */
  loadHistory?: (task: TTask) => Promise<KanbanHistoryEntry[]>;
  onArchive?: (task: TTask, archived: boolean) => Promise<void>;
  /**
   * Which cards to show. Kept apart from `tasks` so the board still sees every card:
   * clearing a filter must not make cards look "changed by someone else".
   */
  taskFilter?: (task: TTask) => boolean;
  /** "auto" = hidden by rule (e.g. published long ago), so it can't be un-archived by hand. */
  archiveState?: (task: TTask) => "active" | "archived" | "auto";
  /** Background refetch. When present, the board refreshes on an interval and when the tab regains focus. */
  onRefresh?: () => Promise<void>;
  refreshIntervalMs?: number;
  onApprove?: (task: TTask, action: "schedule" | "publish", scheduledAt?: string) => Promise<void>;
  onReject?: (task: TTask) => Promise<void>;
};

const labelPalette = [
  "bg-blue-50 text-blue-700 ring-blue-200",
  "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "bg-amber-50 text-amber-700 ring-amber-200",
  "bg-rose-50 text-rose-700 ring-rose-200",
  "bg-violet-50 text-violet-700 ring-violet-200",
  "bg-slate-50 text-slate-700 ring-slate-200",
];

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function priorityLabel(priority: string) {
  const labels: Record<string, string> = {
    baixa: "Baixa",
    media: "Média",
    alta: "Alta",
  };

  return labels[priority] ?? priority;
}

function priorityTone(priority: string): StatusTone {
  if (priority === "alta") return "danger";
  if (priority === "media") return "warning";
  return "neutral";
}

function formatDate(value?: string | null) {
  if (!value) return "Sem prazo";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(value));
}

function truncate(value?: string | null) {
  if (!value) return "Sem descrição.";
  return value.length > 130 ? `${value.slice(0, 130)}...` : value;
}

function formatScheduledAt(scheduledAt: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(scheduledAt));
}

function ScheduledBadge({ scheduledAt }: { scheduledAt: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
      <Clock size={12} />
      Agendado · {formatScheduledAt(scheduledAt)}
    </span>
  );
}

function normalizeList<T>(value?: T[]) {
  return Array.isArray(value) ? value : [];
}

function labelClass(label: string) {
  const sum = Array.from(label).reduce((total, char) => total + char.charCodeAt(0), 0);
  return labelPalette[sum % labelPalette.length];
}

function toInputDate(value?: string | null) {
  return value?.slice(0, 10) ?? "";
}

function taskToForm<TStatus extends string>(
  task: KanbanTaskBase,
  fallbackStatus: TStatus,
): TaskForm<TStatus> {
  return {
    title: task.title,
    description: task.description ?? "",
    assignedTo: normalizeList(task.assignedTo),
    dueDate: toInputDate(task.dueDate),
    priority: task.priority,
    status: (task.status as TStatus) ?? fallbackStatus,
    channel: task.channel ?? "",
    format: task.format ?? "",
    stagesDone: normalizeList(task.stagesDone),
    labels: normalizeList(task.labels),
    comments: normalizeList(task.comments),
    checklist: normalizeList(task.checklist),
  };
}

function emptyForm<TStatus extends string>(status: TStatus, channel?: string): TaskForm<TStatus> {
  return {
    title: "",
    description: "",
    assignedTo: [],
    dueDate: "",
    priority: "media",
    status,
    channel,
    format: "",
    stagesDone: [],
    labels: [],
    comments: [],
    checklist: [],
  };
}

const DEFAULT_REFRESH_INTERVAL_MS = 30_000;
/** How long a card changed elsewhere stays highlighted. */
const HIGHLIGHT_MS = 4_000;
/** Ignore focus-triggered refreshes this soon after the previous one. */
const FOCUS_REFRESH_MIN_GAP_MS = 5_000;
/** A local edit only suppresses the "changed elsewhere" highlight for this long. */
const SELF_TOUCH_TTL_MS = 30_000;
const LANDED_MS = 400;

const skeletonCardsPerColumn = [3, 2, 2, 1, 1];

type DropState = "none" | "valid" | "invalid";

/**
 * Target what is under the finger/pointer, preferring a card over its column. In a gap between
 * cards, the closest card of that column wins; outside every column, the closest target.
 */
const pointerFirstCollision: CollisionDetection = (args) => {
  const underPointer = pointerWithin(args);
  if (underPointer.length === 0) return closestCenter(args);

  const cards = underPointer.filter((collision) => !String(collision.id).startsWith("column:"));
  if (cards.length > 0) return cards;

  const columnId = String(underPointer[0].id);
  const status = columnId.replace("column:", "");
  const cardsInColumn = args.droppableContainers.filter(
    (container) => container.data.current?.status === status && container.id !== args.active.id,
  );
  if (cardsInColumn.length === 0) return underPointer;
  return closestCenter({ ...args, droppableContainers: cardsInColumn });
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const list = window.matchMedia(query);
    const onChange = () => setMatches(list.matches);
    onChange();
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** Title-only card creation at the top of a column. Enter creates and keeps the field open for the next one. */
function QuickCreateForm({
  columnLabel,
  onClose,
  onSubmit,
}: {
  columnLabel: string;
  onClose: () => void;
  onSubmit: (title: string) => Promise<boolean>;
}) {
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const isCreating = pending > 0;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <form
      className="rounded-lg border border-dashed border-stone-300 bg-white p-2 animate-fade-slide-up dark:border-slate-600 dark:bg-slate-800"
      onSubmit={async (event) => {
        event.preventDefault();
        const value = title.trim();
        if (!value) return;
        // Clear at once so the next title can be typed while this one saves; restore it on failure.
        setTitle("");
        setPending((count) => count + 1);
        const created = await onSubmit(value);
        setPending((count) => count - 1);
        if (!created) setTitle((current) => current || value);
        inputRef.current?.focus();
      }}
    >
      <label className="sr-only" htmlFor={`quick-create-${columnLabel}`}>
        Título do novo card em {columnLabel}
      </label>
      <input
        aria-keyshortcuts="Escape"
        className="h-9 w-full rounded-md border-0 bg-transparent px-1.5 text-[13px] font-semibold text-pegasus-navy placeholder:font-normal placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-pegasus-sky/40"
        id={`quick-create-${columnLabel}`}
        maxLength={160}
        onBlur={() => {
          if (!title.trim() && !isCreating) onClose();
        }}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            onClose();
          }
        }}
        placeholder="Título do card"
        ref={inputRef}
        value={title}
      />
      <p className="mt-1 flex items-center justify-between px-1.5 text-[10px] font-semibold text-stone-400">
        <span>{isCreating ? "Criando…" : "Enter cria · Esc fecha"}</span>
        <span>Formato e responsável depois</span>
      </p>
    </form>
  );
}

/** Counter that pops when its value changes (not on first render). */
function AnimatedCount({ value }: { value: number }) {
  const previous = useRef(value);
  const hasChanged = useRef(false);
  if (previous.current !== value) {
    previous.current = value;
    hasChanged.current = true;
  }

  // Keyed by value so the span remounts and the animation replays on every change.
  return (
    <span
      className={`inline-block tabular-nums ${hasChanged.current ? "animate-kanban-pop" : ""}`}
      key={value}
    >
      {value}
    </span>
  );
}

function ChecklistCheckbox({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <span className="relative inline-grid h-4 w-4 shrink-0 place-items-center">
      <input
        checked={checked}
        className="peer absolute inset-0 m-0 h-full w-full cursor-pointer appearance-none rounded border border-stone-300 bg-white transition-colors duration-150 checked:border-emerald-500 checked:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pegasus-sky focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-500 dark:bg-slate-800 dark:checked:border-emerald-500 dark:checked:bg-emerald-500"
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <Check
        aria-hidden="true"
        className="pointer-events-none relative scale-0 text-white transition-transform duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] peer-checked:scale-100"
        size={12}
        strokeWidth={3.5}
      />
    </span>
  );
}

function ChecklistProgress({ done, total }: { done: number; total: number }) {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const complete = total > 0 && done === total;

  return (
    <div aria-hidden="true" className="mt-2.5 h-1 overflow-hidden rounded-full bg-stone-100 dark:bg-slate-700">
      <div
        className={`h-full rounded-full transition-[width,background-color] duration-500 ease-out ${
          complete ? "bg-emerald-500" : "bg-stone-400 dark:bg-slate-400"
        }`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function KanbanSkeleton<TStatus extends string>({
  areaLabel,
  columns,
  gridClass,
}: {
  areaLabel: string;
  columns: Array<ColumnConfig<TStatus>>;
  gridClass: string;
}) {
  return (
    <section aria-busy="true" className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 xl:overflow-visible">
      <span className="sr-only">Carregando {areaLabel}</span>
      <div className={gridClass}>
        {columns.map((column, columnIndex) => (
          <div className="w-[84vw] max-w-sm shrink-0 p-2 sm:w-80 xl:w-auto xl:max-w-none" key={column.value}>
            <div className="mb-3 flex items-center justify-between border-b-2 border-stone-900 px-1 pb-2.5 dark:border-slate-200">
              <h2 className="text-[13px] font-bold text-pegasus-navy">{column.label}</h2>
              <Skeleton className="h-3 w-4" />
            </div>
            <div className="min-h-36 space-y-2">
              {Array.from({ length: skeletonCardsPerColumn[columnIndex % skeletonCardsPerColumn.length] }).map(
                (_, cardIndex) => (
                  <div
                    className="rounded-lg border border-stone-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800"
                    key={cardIndex}
                  >
                    <Skeleton className={`h-3.5 ${cardIndex % 2 === 0 ? "w-4/5" : "w-3/5"}`} />
                    <Skeleton className="mt-2 h-3 w-full" />
                    <Skeleton className="mt-1.5 h-3 w-2/3" />
                    <div className="mt-3 flex items-center gap-2">
                      <Skeleton className="h-5 w-5 rounded-full" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const dropStateClass: Record<DropState, string> = {
  none: "",
  valid: "bg-emerald-50 ring-2 ring-emerald-300 dark:bg-emerald-950/40 dark:ring-emerald-700",
  invalid: "bg-stone-100 outline-dashed outline-2 outline-stone-300 dark:bg-slate-800 dark:outline-slate-600",
};

function Column<TTask extends KanbanTaskBase, TStatus extends string>({
  canUpdate,
  isNarrow,
  quickCreate,
  column,
  dropState,
  highlightedIds,
  icon: Icon,
  landedId,
  locked,
  tasks,
  onCardClick,
}: {
  canUpdate: boolean;
  /** Small screens move cards with the ⋯ menu; dragging fights with scrolling there. */
  isNarrow: boolean;
  quickCreate?: { isOpen: boolean; onOpen: () => void; onClose: () => void; onSubmit: (title: string) => Promise<boolean> };
  column: ColumnConfig<TStatus>;
  dropState: DropState;
  highlightedIds: Set<string>;
  icon: LucideIcon;
  landedId: string | null;
  locked?: boolean;
  tasks: TTask[];
  onCardClick: (task: TTask) => void;
}) {
  const { setNodeRef } = useDroppable({ id: `column:${column.value}` });

  return (
    <div
      className={`w-[84vw] max-w-sm shrink-0 rounded-xl p-2 transition-[background-color,box-shadow] duration-200 sm:w-80 xl:w-auto xl:max-w-none ${dropStateClass[dropState]}`}
      ref={setNodeRef}
    >
      <div className="mb-3 flex items-center justify-between border-b-2 border-stone-900 px-1 pb-2.5 dark:border-slate-200">
        <div className="flex items-center gap-2">
          <Icon className="text-stone-500" size={16} />
          <h2 className="text-[13px] font-bold text-pegasus-navy">{column.label}</h2>
        </div>
        <div className="flex items-center gap-1">
          <span
            aria-label={`${tasks.length} ${tasks.length === 1 ? "card" : "cards"}`}
            className="text-xs font-bold text-stone-400"
          >
            <AnimatedCount value={tasks.length} />
          </span>
          {quickCreate ? (
            <button
              aria-expanded={quickCreate.isOpen}
              aria-label={`Criar card em ${column.label}`}
              className="-mr-1 grid h-7 w-7 place-items-center rounded-md text-stone-400 transition hover:bg-stone-100 hover:text-pegasus-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-pegasus-sky dark:hover:bg-slate-700 dark:hover:text-slate-100"
              onClick={quickCreate.isOpen ? quickCreate.onClose : quickCreate.onOpen}
              title="Criar card (N)"
              type="button"
            >
              <Plus aria-hidden="true" size={15} />
            </button>
          ) : null}
        </div>
      </div>
      {dropState === "invalid" ? (
        <p className="mb-2 px-1 text-[11px] font-semibold text-stone-500">Não pode mover para cá.</p>
      ) : null}
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="min-h-36 space-y-2">
          {quickCreate?.isOpen ? (
            <QuickCreateForm columnLabel={column.label} onClose={quickCreate.onClose} onSubmit={quickCreate.onSubmit} />
          ) : null}
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <SortableTaskCard
                canUpdate={canUpdate && !locked && !isNarrow}
                highlighted={highlightedIds.has(task.id)}
                key={task.id}
                landed={landedId === task.id}
                task={task}
                onCardClick={onCardClick}
              />
            ))
          ) : quickCreate?.isOpen ? null : (
            <EmptyState
              description={isNarrow ? "Use o menu ⋯ de um card para trazê-lo para cá." : "Arraste uma tarefa para esta coluna."}
              icon={Icon}
              title="Coluna vazia"
            />
          )}
        </div>
      </SortableContext>
    </div>
  );
}

const priorityDot: Record<string, string> = {
  alta: "bg-amber-500",
  media: "bg-stone-400",
  baixa: "bg-stone-300",
};

function initialsOf(value?: string | null) {
  if (!value) return "?";
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

/** Board-wide info every card needs; provided once instead of drilled through each column. */
type CardContextValue = {
  approvalColumn?: string;
  canUpdate: boolean;
  channelsByValue: Map<string, KanbanChannelOption>;
  currentUserName?: string;
  formatsByValue: Map<string, KanbanFormatOption>;
  peopleLabels: Map<string, string>;
  /** Columns where a due date no longer matters (scheduled, last column). */
  finishedStatuses: Set<string>;
  staleAfterDays: Partial<Record<string, number>>;
  stagesColumn?: string;
  statusLabel: (status: string) => string;
  onStagesChange: (taskId: string, stagesDone: string[]) => void;
  minDueDate?: string;
  archiveStateOf: (task: KanbanTaskBase) => "active" | "archived" | "auto";
  moveTargets: (task: KanbanTaskBase) => CardMenuColumn[];
  menu: {
    assignToggle?: (taskId: string) => void;
    changeDue?: (taskId: string, dueDate: string | null) => void;
    move?: (taskId: string, status: string) => void;
    duplicate?: (taskId: string) => void;
    archive?: (taskId: string, archived: boolean) => void;
  };
  onMenuOpenChange: (open: boolean) => void;
};

const CardContext = createContext<CardContextValue | null>(null);

function useCardContext() {
  const value = useContext(CardContext);
  if (!value) throw new Error("TaskCard must be rendered inside AdvancedKanban");
  return value;
}

/** Stops dnd-kit from starting a drag when the press begins on a control inside the card. */
const stopDragStart = {
  onPointerDown: (event: { stopPropagation: () => void }) => event.stopPropagation(),
  onTouchStart: (event: { stopPropagation: () => void }) => event.stopPropagation(),
  onKeyDown: (event: { stopPropagation: () => void }) => event.stopPropagation(),
};

function AssigneeAvatars({ names, peopleLabels, me }: { names: string[]; peopleLabels: Map<string, string>; me?: string }) {
  if (names.length === 0) {
    return (
      <span
        className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-dashed border-stone-300 text-[9px] font-bold text-stone-400 dark:border-slate-600"
        title="Sem responsável"
      >
        ?
      </span>
    );
  }

  const visible = names.slice(0, 3);
  const overflow = names.length - visible.length;
  const describe = (name: string) => peopleLabels.get(name) ?? name;

  return (
    <span className="flex shrink-0 -space-x-1.5">
      {visible.map((name) => (
        <span
          aria-label={describe(name)}
          className={`grid h-5 w-5 place-items-center rounded-full border border-white text-[9px] font-bold dark:border-slate-800 ${avatarClass(name)} ${
            sameName(name, me) ? "ring-2 ring-pegasus-sky ring-offset-1 dark:ring-offset-slate-800" : ""
          }`}
          key={name}
          role="img"
          title={describe(name)}
        >
          {initialsOf(name)}
        </span>
      ))}
      {overflow > 0 ? (
        <span
          className="grid h-5 w-5 place-items-center rounded-full border border-white bg-stone-300 text-[9px] font-bold text-stone-700 dark:border-slate-800"
          title={names.slice(3).map(describe).join(", ")}
        >
          +{overflow}
        </span>
      ) : null}
    </span>
  );
}

/** Segmented track like the old Pauta: clicking a segment marks every stage up to it as done. */
function StageTrack({
  canUpdate,
  compact = false,
  done,
  stages,
  onChange,
}: {
  canUpdate: boolean;
  compact?: boolean;
  done: string[];
  stages: KanbanStage[];
  onChange: (next: string[]) => void;
}) {
  const doneSet = new Set(done);
  // Cumulative: progress is the first stage not done.
  const progress = stages.findIndex((stage) => !doneSet.has(stage.key));
  const doneCount = progress === -1 ? stages.length : progress;
  const next = stages[doneCount];

  function select(index: number) {
    // Clicking the last done segment undoes it; any other click fills up to that segment.
    const target = index + 1 === doneCount ? index : index + 1;
    onChange(stages.slice(0, target).map((stage) => stage.key));
  }

  return (
    <div className={compact ? "mt-2.5" : ""}>
      <div className="flex gap-0.5">
        {stages.map((stage, index) => {
          const isDone = index < doneCount;
          return (
            <button
              aria-label={`${stage.label}: ${isDone ? "feito" : "a fazer"}`}
              aria-pressed={isDone}
              className={`relative z-10 flex-1 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-pegasus-sky focus-visible:ring-offset-1 ${
                compact ? "h-1.5" : "h-2"
              } ${isDone ? "bg-emerald-500" : "bg-stone-200 dark:bg-slate-700"} ${
                canUpdate ? (isDone ? "hover:bg-emerald-600" : "hover:bg-stone-300 dark:hover:bg-slate-600") : "cursor-default"
              }`}
              disabled={!canUpdate}
              key={stage.key}
              onClick={(event) => {
                event.stopPropagation();
                select(index);
              }}
              title={stage.label}
              type="button"
              {...stopDragStart}
            />
          );
        })}
      </div>
      <p className="mt-1 text-[10px] font-semibold text-slate-400">
        {next ? (
          <>
            {doneCount}/{stages.length} · próxima: <span className="text-slate-500 dark:text-slate-300">{next.label}</span>
          </>
        ) : (
          <span className="text-emerald-600 dark:text-emerald-400">Esteira completa · pronto para Revisão</span>
        )}
      </p>
    </div>
  );
}

function SortableTaskCard<TTask extends KanbanTaskBase>({
  canUpdate,
  highlighted,
  landed,
  task,
  onCardClick,
}: {
  canUpdate: boolean;
  highlighted: boolean;
  landed: boolean;
  task: TTask;
  onCardClick: (task: TTask) => void;
}) {
  const { isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: task.id,
    disabled: !canUpdate,
    data: { status: task.status },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // dnd-kit's attributes (role/tabIndex) are not spread: the card opens through its title button,
  // and keyboard users move cards with "Mover para" in the details modal.
  return (
    <TaskCard
      dragListeners={canUpdate ? (listeners as unknown as Record<string, (...event: unknown[]) => void>) : undefined}
      highlighted={highlighted}
      isDragging={isDragging}
      landed={landed}
      refCallback={setNodeRef}
      style={style}
      task={task}
      onCardClick={onCardClick}
    />
  );
}

function TaskCard<TTask extends KanbanTaskBase>({
  dragListeners,
  highlighted = false,
  isDragging = false,
  isOverlay = false,
  landed = false,
  refCallback,
  style,
  task,
  onCardClick,
}: {
  dragListeners?: Record<string, (...event: unknown[]) => void>;
  highlighted?: boolean;
  isDragging?: boolean;
  /** Copy that follows the pointer while dragging (rendered in DragOverlay). */
  isOverlay?: boolean;
  landed?: boolean;
  refCallback?: (node: HTMLElement | null) => void;
  style?: CSSProperties;
  task: TTask;
  onCardClick: (task: TTask) => void;
}) {
  const ctx = useCardContext();
  const labels = normalizeList(task.labels);
  const checklist = normalizeList(task.checklist);
  const comments = normalizeList(task.comments);
  const doneItems = checklist.filter((item) => item.done).length;
  const assignees = normalizeList(task.assignedTo);
  const format = task.format ? ctx.formatsByValue.get(task.format) : undefined;
  const channel = task.channel ? ctx.channelsByValue.get(task.channel) : undefined;
  const FormatIcon = format?.icon;
  const ChannelIcon = channel?.icon;
  const isFinished = ctx.finishedStatuses.has(task.status);
  const due = isFinished ? null : describeDue(task.dueDate);
  const staleLimit = ctx.staleAfterDays[task.status];
  const daysInColumn = staleLimit !== undefined ? daysSince(task.statusChangedAt ?? task.updatedAt) : null;
  const isStale = staleLimit !== undefined && daysInColumn !== null && daysInColumn >= staleLimit;
  const links = extractLinks([task.description, ...comments.map((comment) => comment.text)]);
  const isMine = Boolean(ctx.currentUserName && assignees.some((name) => sameName(name, ctx.currentUserName)));
  const showStages = Boolean(format && format.stages.length > 0 && task.status === ctx.stagesColumn);
  const awaitingApproval = Boolean(ctx.approvalColumn && task.status === ctx.approvalColumn);
  const archive = ctx.archiveStateOf(task);
  const hasMenu = !isOverlay && Object.values(ctx.menu).some(Boolean);

  return (
    <article
      aria-roledescription={dragListeners ? "card arrastável" : undefined}
      className={`group relative rounded-lg border p-3 pl-3.5 ${archive !== "active" ? "opacity-60" : ""} ${
        isMine ? "bg-pegasus-ice/60 dark:bg-emerald-950/20" : "bg-white dark:bg-slate-800"
      } ${
        isOverlay
          ? "cursor-grabbing border-stone-300 shadow-2xl"
          : isDragging
            ? "border-dashed border-stone-300 opacity-40 shadow-none"
            : `card-interactive border-stone-200 has-[.card-open:focus-visible]:ring-2 has-[.card-open:focus-visible]:ring-pegasus-sky has-[.card-open:focus-visible]:ring-offset-2 dark:border-slate-700 dark:has-[.card-open:focus-visible]:ring-offset-slate-900 ${
                landed ? "animate-kanban-settle" : ""
              }`
      } ${dragListeners && !isDragging ? "cursor-grab active:cursor-grabbing" : ""}`}
      ref={refCallback}
      style={style}
      {...dragListeners}
    >
      {format ? (
        <span aria-hidden="true" className={`pointer-events-none absolute inset-y-0 left-0 w-1 rounded-l-lg ${format.stripClass}`} />
      ) : null}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 rounded-lg shadow-glow ring-2 ring-inset ring-emerald-400 transition-opacity duration-1000 ${
          highlighted ? "opacity-100" : "opacity-0"
        }`}
      />

      {hasMenu ? (
        <div className="absolute right-2 top-2 z-10">
          <CardMenu
            columns={ctx.moveTargets(task)}
            isArchived={archive !== "active"}
            isAutoArchived={archive === "auto"}
            isMine={isMine}
            minDueDate={ctx.minDueDate}
            title={task.title}
            onArchive={ctx.menu.archive ? (archived) => ctx.menu.archive?.(task.id, archived) : undefined}
            onAssignToggle={ctx.menu.assignToggle ? () => ctx.menu.assignToggle?.(task.id) : undefined}
            onDueChange={ctx.menu.changeDue ? (value) => ctx.menu.changeDue?.(task.id, value) : undefined}
            onDuplicate={ctx.menu.duplicate ? () => ctx.menu.duplicate?.(task.id) : undefined}
            onMove={ctx.menu.move ? (status) => ctx.menu.move?.(task.id, status) : undefined}
            onOpenChange={ctx.onMenuOpenChange}
          />
        </div>
      ) : null}

      {format || channel ? (
        <div className={`mb-1.5 flex items-center gap-1.5 ${hasMenu ? "pr-7" : ""}`}>
          {format && FormatIcon ? (
            <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ring-1 ${format.chipClass}`}>
              <FormatIcon aria-hidden="true" size={11} />
              {format.label}
            </span>
          ) : null}
          {channel ? (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-stone-500 dark:text-slate-400"
              title={`Canal: ${channel.label}`}
            >
              {ChannelIcon ? <ChannelIcon aria-hidden="true" size={12} /> : null}
              {channel.label}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className={`flex items-start gap-2 ${hasMenu && !format && !channel ? "pr-7" : ""}`}>
        <span
          aria-label={`Prioridade ${priorityLabel(task.priority).toLowerCase()}`}
          className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${priorityDot[task.priority] ?? "bg-stone-300"}`}
          role="img"
        />
        <div className="min-w-0 flex-1">
          {isOverlay ? (
            <h3 className="text-[13px] font-bold leading-snug text-pegasus-navy">{task.title}</h3>
          ) : (
            <h3 className="text-[13px] font-bold leading-snug text-pegasus-navy">
              {/* Stretched button: the whole card opens the details; inner controls sit above it. */}
              <button
                className="card-open text-left after:absolute after:inset-0 after:content-[''] focus:outline-none"
                onClick={() => onCardClick(task)}
                type="button"
              >
                {task.title}
              </button>
            </h3>
          )}
          {task.description ? (
            <p className="mt-1 text-xs leading-5 text-slate-500 [overflow-wrap:anywhere]">{truncate(task.description)}</p>
          ) : null}

          {labels.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {labels.map((label) => (
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${labelClass(label)}`}
                  key={label}
                >
                  {label}
                </span>
              ))}
            </div>
          ) : null}

          {showStages && format ? (
            <StageTrack
              canUpdate={ctx.canUpdate && !isOverlay}
              compact
              done={normalizeList(task.stagesDone)}
              stages={format.stages}
              onChange={(next) => ctx.onStagesChange(task.id, next)}
            />
          ) : null}

          {/* With a stage track the checklist shows only as the counter below, to avoid two stacked bars. */}
          {checklist.length > 0 && !showStages ? <ChecklistProgress done={doneItems} total={checklist.length} /> : null}

          <div className="mt-2.5 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <AssigneeAvatars me={ctx.currentUserName} names={assignees} peopleLabels={ctx.peopleLabels} />
              {due ? (
                <span
                  className={`inline-flex min-w-0 items-center gap-1 truncate text-[11px] font-semibold ${
                    due.tone === "overdue"
                      ? "text-rose-600 dark:text-rose-400"
                      : due.tone === "soon"
                        ? "text-amber-700 dark:text-amber-400"
                        : "text-stone-500 dark:text-slate-400"
                  }`}
                  title={due.title}
                >
                  {due.tone === "overdue" ? <AlertCircle aria-hidden="true" className="shrink-0" size={11} /> : null}
                  {due.label}
                </span>
              ) : !isFinished ? (
                <span className="text-[11px] font-semibold text-stone-400">Sem prazo</span>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2 text-[11px] font-bold text-stone-400">
              {links.slice(0, 3).map((link) => {
                const LinkIcon = link.icon;
                return (
                  <a
                    aria-label={`Abrir ${link.label}`}
                    className="relative z-10 rounded text-stone-400 transition-colors hover:text-pegasus-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-pegasus-sky dark:hover:text-slate-100"
                    href={link.url}
                    key={link.url}
                    onClick={(event) => event.stopPropagation()}
                    rel="noopener noreferrer"
                    target="_blank"
                    title={`${link.label}: ${link.url}`}
                    {...stopDragStart}
                  >
                    <LinkIcon size={13} />
                  </a>
                );
              })}
              {links.length > 3 ? <span title={`${links.length} links`}>+{links.length - 3}</span> : null}
              {comments.length > 0 ? (
                <span className="inline-flex items-center gap-1" title={`${comments.length} comentário(s)`}>
                  <MessageSquare aria-hidden="true" size={11} />
                  {comments.length}
                </span>
              ) : null}
              {checklist.length > 0 ? (
                <span className="inline-flex items-center gap-1" title="Checklist">
                  <CheckSquare aria-hidden="true" size={11} />
                  {doneItems}/{checklist.length}
                </span>
              ) : null}
            </div>
          </div>

          {daysInColumn !== null ? (
            <p
              className={`mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold ${
                isStale
                  ? "rounded-full bg-amber-50 px-1.5 py-0.5 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900"
                  : "text-stone-400"
              }`}
              title={isStale ? `Parado há mais de ${staleLimit} dias` : undefined}
            >
              <Hourglass aria-hidden="true" size={10} />
              {describeTimeInColumn(daysInColumn, ctx.statusLabel(task.status))}
            </p>
          ) : null}
        </div>
      </div>

      {archive !== "active" ? (
        <div className="mt-2.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-bold text-stone-600 ring-1 ring-stone-200 dark:bg-slate-700 dark:text-slate-300 dark:ring-slate-600">
            <Archive aria-hidden="true" size={12} />
            {archive === "auto" ? "Arquivado automaticamente" : "Arquivado"}
          </span>
        </div>
      ) : null}

      {awaitingApproval && archive === "active" ? (
        <div className="mt-2.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900">
            <ShieldAlert aria-hidden="true" size={12} />
            Aguardando aprovação
          </span>
        </div>
      ) : null}

      {task.scheduledAt && task.status === "scheduled" ? (
        <div className="mt-2.5">
          <ScheduledBadge scheduledAt={task.scheduledAt} />
        </div>
      ) : null}
    </article>
  );
}

export function AdvancedKanban<TTask extends KanbanTaskBase, TStatus extends string>({
  areaLabel,
  approvalColumn,
  scheduledColumn,
  canApprove,
  canCreate,
  canDelete,
  canUpdate,
  channelOptions,
  columns,
  currentUserName,
  description,
  emptyStatus,
  filters,
  icon,
  isLoading,
  isSaving,
  labelsAsTab,
  minDueDate,
  onApprove,
  onCreate,
  onDelete,
  onChecklistToggle,
  onMove,
  onStagesToggle,
  onQuickCreate,
  onQuickUpdate,
  onDuplicate,
  onAddComment,
  onReorder,
  loadHistory,
  openTask,
  onOpenTaskHandled,
  onArchive,
  archiveState,
  onRefresh,
  onReject,
  onUpdate,
  refreshIntervalMs = DEFAULT_REFRESH_INTERVAL_MS,
  responsibleOptions,
  formatOptions,
  stagesColumn,
  staleAfterDays,
  savedLabels,
  taskFilter,
  tasks,
  title,
}: AdvancedKanbanProps<TTask, TStatus>) {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeWidth, setActiveWidth] = useState<number | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formTab, setFormTab] = useState<"detalhes" | "etiquetas">("detalhes");
  const [editingTask, setEditingTask] = useState<TTask | null>(null);
  const [viewTask, setViewTask] = useState<TTask | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TTask | null>(null);
  const [approvalTask, setApprovalTask] = useState<TTask | null>(null);
  const [approvalMode, setApprovalMode] = useState<"schedule" | "publish" | null>(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [form, setForm] = useState<TaskForm<TStatus>>(() =>
    emptyForm(emptyStatus, formatOptions ? "" : channelOptions?.[0]?.value),
  );
  const [labelInput, setLabelInput] = useState("");
  const [assigneeInput, setAssigneeInput] = useState("");
  const [commentInput, setCommentInput] = useState("");
  const [checklistInput, setChecklistInput] = useState("");
  // Optimistic edits (move, sub-stages, assignee, due date): each is a patch layered over the
  // server task until its request settles. Tokens let a settled edit remove only its own patch.
  const [overrides, setOverrides] = useState<Record<string, Array<{ token: number; patch: Partial<KanbanTaskBase> }>>>({});
  const overrideTokenRef = useRef(0);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(() => new Set());
  const [landedId, setLandedId] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState("");
  const [quickCreateColumn, setQuickCreateColumn] = useState<string | null>(null);
  // Column order shown right after a drop, until the save settles (then the server order takes over).
  const [orderOverrides, setOrderOverrides] = useState<Record<string, { ids: string[]; token: number }>>({});
  const orderTokenRef = useRef(0);
  const [openMenus, setOpenMenus] = useState(0);
  const reducedMotion = usePrefersReducedMotion();
  const isNarrow = useMediaQuery("(max-width: 639px)");
  // Mouse drags after a small move; touch needs a long press so scrolling the board still works.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  const displayTasks = useMemo(() => {
    const patched =
      Object.keys(overrides).length === 0
        ? tasks
        : tasks.map((task) =>
            overrides[task.id]
              ? (overrides[task.id].reduce((merged, entry) => ({ ...merged, ...entry.patch }), task) as TTask)
              : task,
          );
    return taskFilter ? patched.filter(taskFilter) : patched;
  }, [overrides, taskFilter, tasks]);
  const activeTask = useMemo(
    () => displayTasks.find((task) => task.id === activeTaskId) ?? null,
    [activeTaskId, displayTasks],
  );

  // --- Timers (highlight fade, landing animation) cleaned up on unmount ---
  const timersRef = useRef<number[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((item) => item !== id);
      fn();
    }, ms);
    timersRef.current.push(id);
  }, []);
  useEffect(() => () => timersRef.current.forEach((id) => window.clearTimeout(id)), []);

  const markLanded = useCallback(
    (taskId: string) => {
      setLandedId(taskId);
      later(() => setLandedId((current) => (current === taskId ? null : current)), LANDED_MS);
    },
    [later],
  );

  // --- Highlight cards changed elsewhere (another person, another tab) ---
  // Edits made here are "self-touched" and don't light up when they come back from the server.
  const selfTouchedRef = useRef<Map<string, number>>(new Map());
  const expectOwnCreateRef = useRef(false);
  const seenRef = useRef<{ at: number; updatedAt: Map<string, string> } | null>(null);

  const touch = useCallback((taskId: string) => {
    selfTouchedRef.current.set(taskId, Date.now());
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const now = Date.now();
    const previous = seenRef.current;
    const nextSeen = new Map(previous?.updatedAt ?? []);
    const changed: string[] = [];
    let sawNew = false;

    for (const [id, touchedAt] of selfTouchedRef.current) {
      if (now - touchedAt > SELF_TOUCH_TTL_MS) selfTouchedRef.current.delete(id);
    }

    for (const task of tasks) {
      const before = previous?.updatedAt.get(task.id);
      nextSeen.set(task.id, task.updatedAt);
      if (!previous) continue;

      // New = created since the last look (10s of slack for clock differences). Archived cards
      // showing up because "show archived" was turned on are not news.
      const isArchived = (archiveState?.(task) ?? "active") !== "active";
      const isNew =
        before === undefined && !isArchived && new Date(task.createdAt).getTime() > previous.at - 10_000;
      const isChanged = before !== undefined && before !== task.updatedAt;
      if (!isNew && !isChanged) continue;

      if (selfTouchedRef.current.has(task.id)) {
        selfTouchedRef.current.delete(task.id);
        continue;
      }
      if (isNew && expectOwnCreateRef.current) {
        sawNew = true;
        continue;
      }
      changed.push(task.id);
    }

    if (sawNew) expectOwnCreateRef.current = false;
    seenRef.current = { at: now, updatedAt: nextSeen };
    if (changed.length === 0) return;

    setHighlightedIds((current) => new Set([...current, ...changed]));
    setLiveMessage(
      changed.length === 1 ? "1 card atualizado no quadro." : `${changed.length} cards atualizados no quadro.`,
    );
    later(() => {
      setHighlightedIds((current) => {
        const next = new Set(current);
        changed.forEach((id) => next.delete(id));
        return next;
      });
    }, HIGHLIGHT_MS);
  }, [archiveState, isLoading, later, tasks]);

  // --- Background refresh: interval + tab focus, paused while the person is busy ---
  const hasPendingMoves = Object.keys(overrides).length > 0;
  const isBusy =
    Boolean(activeTaskId) ||
    isFormOpen ||
    Boolean(viewTask) ||
    Boolean(deleteTarget) ||
    Boolean(approvalTask) ||
    openMenus > 0 ||
    Object.keys(orderOverrides).length > 0 ||
    hasPendingMoves ||
    isSaving;
  const isBusyRef = useRef(isBusy);
  isBusyRef.current = isBusy;
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;
  const lastRefreshRef = useRef(Date.now());
  const refreshingRef = useRef(false);
  const hasRefresh = Boolean(onRefresh);

  const refreshNow = useCallback(async () => {
    const refresh = onRefreshRef.current;
    if (!refresh || isBusyRef.current || refreshingRef.current) return;
    if (document.visibilityState !== "visible") return;
    refreshingRef.current = true;
    lastRefreshRef.current = Date.now();
    try {
      await refresh();
    } catch {
      // Background refresh is best effort; the next tick tries again.
    } finally {
      refreshingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!hasRefresh) return;
    const intervalId = window.setInterval(refreshNow, refreshIntervalMs);
    const onFocus = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastRefreshRef.current < FOCUS_REFRESH_MIN_GAP_MS) return;
      void refreshNow();
    };
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [hasRefresh, refreshIntervalMs, refreshNow]);

  // Catch up on a tick skipped while busy (e.g. a modal stayed open for a while).
  useEffect(() => {
    if (!hasRefresh || isBusy) return;
    if (Date.now() - lastRefreshRef.current >= refreshIntervalMs) void refreshNow();
  }, [hasRefresh, isBusy, refreshIntervalMs, refreshNow]);

  useEffect(() => {
    if (!openTask) return;
    setViewTask(openTask);
    onOpenTaskHandled?.();
  }, [onOpenTaskHandled, openTask]);

  // Keep the open details in step with the saved card (new comment, quick edits, server changes).
  useEffect(() => {
    if (!viewTask) return;
    const latest = displayTasks.find((task) => task.id === viewTask.id);
    if (latest && latest.updatedAt !== viewTask.updatedAt) setViewTask(latest);
  }, [displayTasks, viewTask]);

  // Auto-close view modal when a scheduled task gets published by the cron job
  useEffect(() => {
    if (!viewTask) return;
    const updated = tasks.find((t) => t.id === viewTask.id);
    if (updated && updated.status === "published" && viewTask.status !== "published") {
      setViewTask(null);
    }
  }, [tasks, viewTask]);

  function statusLabel(status: string) {
    return columns.find((column) => column.value === status)?.label ?? status;
  }

  function openCreateModal() {
    setEditingTask(null);
    setForm(emptyForm(emptyStatus, formatOptions ? "" : channelOptions?.[0]?.value));
    setLabelInput("");
    setCommentInput("");
    setChecklistInput("");
    setFormTab("detalhes");
    setIsFormOpen(true);
  }

  function openEditModal(task: TTask) {
    setEditingTask(task);
    setForm(taskToForm(task, emptyStatus));
    setLabelInput("");
    setCommentInput("");
    setChecklistInput("");
    setFormTab("detalhes");
    setViewTask(null);
    setIsFormOpen(true);
  }

  async function handleApproveConfirm() {
    if (!approvalTask || !approvalMode || !onApprove) return;
    let scheduledAt: string | undefined;
    if (approvalMode === "schedule") {
      if (!scheduledDate) return;
      // Convert local datetime to UTC ISO string so Railway (UTC) gets the correct time
      scheduledAt = new Date(`${scheduledDate}T${scheduledTime || "00:00"}:00`).toISOString();
    }
    touch(approvalTask.id);
    await onApprove(approvalTask, approvalMode, scheduledAt);
    setApprovalTask(null);
    setApprovalMode(null);
    setScheduledDate("");
    setScheduledTime("");
    setViewTask(null);
  }

  async function handleReject(task: TTask) {
    if (!onReject) return;
    touch(task.id);
    await onReject(task);
    setViewTask(null);
  }

  async function handlePublishNow(task: TTask) {
    if (!onApprove) return;
    touch(task.id);
    await onApprove(task, "publish");
    setViewTask(null);
  }

  function openViewModal(task: TTask) {
    setViewTask(task);
  }

  /**
   * Shows `patch` on the card right away, runs `action`, then drops the patch: on success the
   * parent already holds the saved task; on failure the card falls back to what it was.
   * The open details modal follows along. Resolves to whether the action succeeded.
   */
  async function runOptimistic(taskId: string, patch: Partial<KanbanTaskBase>, action: () => Promise<void>) {
    const token = ++overrideTokenRef.current;
    const before = displayTasks.find((item) => item.id === taskId);
    const syncView = (value: Partial<KanbanTaskBase>) =>
      setViewTask((current) => (current && current.id === taskId ? ({ ...current, ...value } as TTask) : current));

    touch(taskId);
    setOverrides((current) => ({ ...current, [taskId]: [...(current[taskId] ?? []), { token, patch }] }));
    syncView(patch);
    try {
      await action();
      return true;
    } catch {
      if (before) {
        syncView(Object.fromEntries(Object.keys(patch).map((key) => [key, before[key as keyof KanbanTaskBase]])));
      }
      return false;
    } finally {
      setOverrides((current) => {
        const remaining = (current[taskId] ?? []).filter((entry) => entry.token !== token);
        const next = { ...current };
        if (remaining.length > 0) next[taskId] = remaining;
        else delete next[taskId];
        return next;
      });
    }
  }

  /** Optimistic sub-stage save, from the card track or the details modal. */
  async function changeStages(taskId: string, stagesDone: string[]) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || !canUpdate) return;
    await runOptimistic(taskId, { stagesDone }, () =>
      onStagesToggle ? onStagesToggle(task, stagesDone) : onUpdate(task, { ...taskToForm(task, emptyStatus), stagesDone }),
    );
  }

  async function toggleViewChecklistItem(itemId: string, done: boolean) {
    if (!viewTask) return;
    const previousChecklist = normalizeList(viewTask.checklist);
    const nextChecklist = previousChecklist.map((item) => (item.id === itemId ? { ...item, done } : item));
    const revert = () =>
      setViewTask((current) =>
        current && current.id === viewTask.id ? ({ ...current, checklist: previousChecklist } as TTask) : current,
      );

    touch(viewTask.id);
    setViewTask({ ...viewTask, checklist: nextChecklist } as TTask);
    try {
      if (onChecklistToggle) {
        await onChecklistToggle(viewTask, nextChecklist);
      } else {
        await onUpdate(viewTask, { ...taskToForm(viewTask, emptyStatus), checklist: nextChecklist });
      }
    } catch {
      revert();
    }
  }

  function isMoveAllowed(currentStatus: string, nextStatus: string): boolean {
    if (nextStatus === currentStatus) return false;

    // Cards in (or waiting to reach) the scheduled column only move via the approve/publish flow.
    if (scheduledColumn && currentStatus === scheduledColumn) return false;

    if (approvalColumn) {
      const approvalIdx = columns.findIndex((c) => c.value === approvalColumn);
      const currentIdx = columns.findIndex((c) => c.value === currentStatus);
      const nextIdx = columns.findIndex((c) => c.value === nextStatus);

      // Cards in review only leave via the approve/reject buttons.
      if (currentStatus === approvalColumn && nextIdx > approvalIdx) return false;
      // Cards before review cannot jump past it.
      if (currentIdx < approvalIdx && nextIdx > approvalIdx) return false;
    }

    return true;
  }

  /** Optimistic: the card shows in the new column at once and goes back if onMove rejects. */
  async function moveTask(task: TTask, status: TStatus): Promise<boolean> {
    if (!isMoveAllowed(task.status, status)) return false;
    const moved = await runOptimistic(task.id, { status }, () => onMove(task, status));
    if (!moved) markLanded(task.id);
    return moved;
  }

  async function handleMoveTo(task: TTask, status: TStatus) {
    await moveTask(task, status);
  }

  // --- Quick create ("+" on a column, or N) ---
  const quickCreateStatuses = onQuickCreate
    ? columns
        .map((column) => column.value)
        .filter(
          (status) =>
            canCreate && status !== scheduledColumn && (status === emptyStatus || !approvalColumn || isMoveAllowed(emptyStatus, status)),
        )
    : [];

  async function quickCreate(title: string, status: TStatus) {
    if (!onQuickCreate) return false;
    expectOwnCreateRef.current = true;
    try {
      await onQuickCreate(title, status);
      return true;
    } catch {
      return false;
    }
  }

  // --- Card menu actions ---
  function findTask(taskId: string) {
    return displayTasks.find((task) => task.id === taskId);
  }

  function moveTargetsOf(task: KanbanTaskBase): CardMenuColumn[] {
    return columns
      .filter((column) => column.value !== task.status)
      .map((column) => ({
        label: column.label,
        value: column.value,
        disabled: !canUpdate || !isMoveAllowed(task.status, column.value),
      }));
  }

  const menuActions: CardContextValue["menu"] = {
    assignToggle:
      onQuickUpdate && canUpdate && currentUserName
        ? (taskId) => {
            const task = findTask(taskId);
            if (!task) return;
            const current = normalizeList(task.assignedTo);
            const assignedTo = current.some((name) => sameName(name, currentUserName))
              ? current.filter((name) => !sameName(name, currentUserName))
              : [...current, currentUserName];
            void runOptimistic(taskId, { assignedTo }, () => onQuickUpdate(task, { assignedTo }));
          }
        : undefined,
    changeDue:
      onQuickUpdate && canUpdate
        ? (taskId, dueDate) => {
            const task = findTask(taskId);
            if (!task) return;
            void runOptimistic(taskId, { dueDate }, () => onQuickUpdate(task, { dueDate }));
          }
        : undefined,
    move: canUpdate
      ? (taskId, status) => {
          const task = findTask(taskId);
          if (task) void moveTask(task, status as TStatus);
        }
      : undefined,
    duplicate:
      onDuplicate && canCreate
        ? (taskId) => {
            const task = findTask(taskId);
            if (!task) return;
            expectOwnCreateRef.current = true;
            void onDuplicate(task).catch(() => undefined);
          }
        : undefined,
    archive:
      onArchive && canUpdate
        ? (taskId, archived) => {
            const task = findTask(taskId);
            if (!task) return;
            touch(taskId);
            void onArchive(task, archived).catch(() => undefined);
          }
        : undefined,
  };
  const menuActionsRef = useRef(menuActions);
  menuActionsRef.current = menuActions;
  const moveTargetsRef = useRef(moveTargetsOf);
  moveTargetsRef.current = moveTargetsOf;
  const archiveStateRef = useRef(archiveState);
  archiveStateRef.current = archiveState;

  // --- Keyboard shortcuts: N new card, / search, Esc closes (menus/forms handle their own Esc) ---
  const shortcutRef = useRef<(event: KeyboardEvent) => void>(() => undefined);
  shortcutRef.current = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest("input, textarea, select, [contenteditable='true'], [role='menu'], [role='dialog']")) return;
    if (isFormOpen || viewTask || deleteTarget || approvalTask) return;

    if (event.key === "n" || event.key === "N") {
      if (!canCreate) return;
      event.preventDefault();
      if (quickCreateStatuses.includes(emptyStatus)) {
        setQuickCreateColumn(emptyStatus);
      } else {
        openCreateModal();
      }
    } else if (event.key === "/") {
      const search = document.querySelector<HTMLInputElement>("[data-kanban-search]");
      if (!search) return;
      event.preventDefault();
      search.focus();
      search.select();
    } else if (event.key === "Escape" && quickCreateColumn) {
      setQuickCreateColumn(null);
    }
  };
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => shortcutRef.current(event);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function columnOf(overId: string | null) {
    if (!overId) return null;
    return overId.startsWith("column:")
      ? overId.replace("column:", "")
      : displayTasks.find((task) => task.id === overId)?.status ?? null;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveTaskId(String(event.active.id));
    setActiveWidth(event.active.rect.current.initial?.width ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    setOverColumn(columnOf(event.over?.id ? String(event.over.id) : null));
  }

  function dropStateFor(columnValue: string): DropState {
    if (!activeTask || overColumn !== columnValue || activeTask.status === columnValue) return "none";
    return isMoveAllowed(activeTask.status, columnValue) ? "valid" : "invalid";
  }

  /** Cards of a column in board order: a pending drop order first, else hand order, else server order. */
  function columnTasks(status: string) {
    const inColumn = displayTasks.filter((task) => task.status === status);
    const override = orderOverrides[status]?.ids;
    const rank = (task: TTask, index: number) => {
      if (override) {
        const at = override.indexOf(task.id);
        return at === -1 ? override.length + index : at;
      }
      return index;
    };
    const indexed = inColumn.map((task, index) => ({ task, index }));
    indexed.sort((a, b) => {
      if (override) return rank(a.task, a.index) - rank(b.task, b.index);
      const pa = a.task.position ?? Number.POSITIVE_INFINITY;
      const pb = b.task.position ?? Number.POSITIVE_INFINITY;
      return pa === pb ? a.index - b.index : pa - pb;
    });
    return indexed.map((item) => item.task);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setOverColumn(null);
    setActiveTaskId(null);

    if (!canUpdate) return;

    const active = displayTasks.find((task) => task.id === String(event.active.id));
    const overId = event.over?.id ? String(event.over.id) : null;
    const nextStatus = columnOf(overId);
    if (!active || !overId || !nextStatus) return;

    const sameColumn = nextStatus === active.status;
    if (!sameColumn && !isMoveAllowed(active.status, nextStatus)) return;
    if (sameColumn && (!onReorder || nextStatus === scheduledColumn)) return;

    // Where in the destination column the card was dropped.
    const current = columnTasks(nextStatus).map((task) => task.id);
    let order: string[];
    if (sameColumn) {
      if (overId.startsWith("column:")) return;
      order = arrayMove(current, current.indexOf(active.id), current.indexOf(overId));
    } else {
      const others = current.filter((id) => id !== active.id);
      let index = others.length;
      if (!overId.startsWith("column:")) {
        const overIndex = others.indexOf(overId);
        const overRect = event.over?.rect;
        const activeRect = event.active.rect.current.translated;
        const below =
          overRect && activeRect ? activeRect.top + activeRect.height / 2 > overRect.top + overRect.height / 2 : false;
        index = overIndex === -1 ? others.length : overIndex + (below ? 1 : 0);
      }
      order = [...others.slice(0, index), active.id, ...others.slice(index)];
    }
    if (sameColumn && order.join() === current.join()) return;

    const at = order.indexOf(active.id);
    const neighbours = { beforeId: order[at - 1] ?? null, afterId: order[at + 1] ?? null };
    const token = ++orderTokenRef.current;
    setOrderOverrides((overrides) => ({ ...overrides, [nextStatus]: { ids: order, token } }));
    markLanded(active.id);

    try {
      if (!sameColumn && !(await moveTask(active, nextStatus as TStatus))) return;
      if (onReorder) {
        touch(active.id);
        await onReorder({ ...active, status: nextStatus } as TTask, neighbours).catch(() => undefined);
      }
    } finally {
      setOrderOverrides((overrides) => {
        if (overrides[nextStatus]?.token !== token) return overrides;
        const next = { ...overrides };
        delete next[nextStatus];
        return next;
      });
    }
  }

  const dropAnimation: DropAnimation | null = reducedMotion
    ? null
    : {
        duration: 200,
        easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        sideEffects: (parameters) => {
          const cleanup = defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.4" } } })(parameters);
          // Straighten the lifted card while it flies to its spot.
          const lifted = parameters.dragOverlay.node.firstElementChild;
          if (lifted instanceof HTMLElement) {
            lifted.style.transition = "transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1)";
            lifted.style.transform = "rotate(0deg) scale(1)";
          }
          return cleanup;
        },
      };

  function addLabelValue(value: string) {
    const nextLabel = value.trim();
    if (!nextLabel || form.labels.includes(nextLabel)) return;
    setForm({ ...form, labels: [...form.labels, nextLabel] });
  }

  function addLabel() {
    addLabelValue(labelInput);
    setLabelInput("");
  }

  function removeLabel(label: string) {
    setForm({ ...form, labels: form.labels.filter((item) => item !== label) });
  }

  function toggleAssignee(name: string) {
    setForm((prev) => ({
      ...prev,
      assignedTo: prev.assignedTo.includes(name)
        ? prev.assignedTo.filter((item) => item !== name)
        : [...prev.assignedTo, name],
    }));
  }

  function addAssigneeFreeText() {
    const name = assigneeInput.trim();
    if (!name || form.assignedTo.includes(name)) return;
    setForm({ ...form, assignedTo: [...form.assignedTo, name] });
    setAssigneeInput("");
  }

  function addComment() {
    const text = commentInput.trim();
    if (!text) return;
    setForm({
      ...form,
      comments: [
        ...form.comments,
        {
          id: makeId("comment"),
          text,
          author: currentUserName,
          createdAt: new Date().toISOString(),
        },
      ],
    });
    setCommentInput("");
  }

  function addChecklistItem() {
    const text = checklistInput.trim();
    if (!text) return;
    setForm({
      ...form,
      checklist: [...form.checklist, { id: makeId("check"), text, done: false }],
    });
    setChecklistInput("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (editingTask) {
      touch(editingTask.id);
      await onUpdate(editingTask, form);
    } else {
      expectOwnCreateRef.current = true;
      await onCreate(form);
    }

    setIsFormOpen(false);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await onDelete(deleteTarget);
    setDeleteTarget(null);
    setViewTask(null);
  }

  const formatsByValue = useMemo(
    () => new Map((formatOptions ?? []).map((option) => [option.value, option])),
    [formatOptions],
  );
  const channelsByValue = useMemo(
    () => new Map((channelOptions ?? []).map((option) => [option.value, option])),
    [channelOptions],
  );
  const peopleLabels = useMemo(
    () => new Map((responsibleOptions ?? []).map((option) => [option.value, option.label])),
    [responsibleOptions],
  );
  const lastColumn = columns[columns.length - 1]?.value;
  const changeStagesRef = useRef(changeStages);
  changeStagesRef.current = changeStages;
  const cardContext = useMemo<CardContextValue>(
    () => ({
      approvalColumn,
      canUpdate,
      channelsByValue,
      currentUserName,
      finishedStatuses: new Set([scheduledColumn, lastColumn].filter((value): value is TStatus => Boolean(value))),
      formatsByValue,
      peopleLabels,
      staleAfterDays: staleAfterDays ?? {},
      stagesColumn,
      statusLabel: (status: string) => columns.find((column) => column.value === status)?.label ?? status,
      onStagesChange: (taskId, stagesDone) => void changeStagesRef.current(taskId, stagesDone),
      minDueDate,
      archiveStateOf: (task) => archiveStateRef.current?.(task as TTask) ?? "active",
      moveTargets: (task) => moveTargetsRef.current(task),
      // Stable wrappers: the real handlers live in menuActionsRef and change every render.
      menu: {
        assignToggle: menuActions.assignToggle ? (taskId) => menuActionsRef.current.assignToggle?.(taskId) : undefined,
        changeDue: menuActions.changeDue ? (taskId, value) => menuActionsRef.current.changeDue?.(taskId, value) : undefined,
        move: menuActions.move ? (taskId, status) => menuActionsRef.current.move?.(taskId, status) : undefined,
        duplicate: menuActions.duplicate ? (taskId) => menuActionsRef.current.duplicate?.(taskId) : undefined,
        archive: menuActions.archive ? (taskId, archived) => menuActionsRef.current.archive?.(taskId, archived) : undefined,
      },
      onMenuOpenChange: (open) => setOpenMenus((count) => Math.max(0, count + (open ? 1 : -1))),
    }),
    [
      approvalColumn,
      canUpdate,
      channelsByValue,
      columns,
      currentUserName,
      formatsByValue,
      lastColumn,
      peopleLabels,
      scheduledColumn,
      staleAfterDays,
      stagesColumn,
      minDueDate,
      // Which menu actions exist only changes with permissions/handlers being provided.
      Boolean(menuActions.assignToggle),
      Boolean(menuActions.changeDue),
      Boolean(menuActions.move),
      Boolean(menuActions.duplicate),
      Boolean(menuActions.archive),
      // The board re-renders cards when tasks change anyway; columns/permissions drive move targets.
      tasks,
    ],
  );
  const formFormat = form.format ? formatsByValue.get(form.format) : undefined;
  const showChannelField = Boolean(channelOptions) && (!formFormat || formFormat.showChannel);
  const viewFormat = viewTask?.format ? formatsByValue.get(viewTask.format) : undefined;
  // Statuses only reachable through approval are not offered in the form (unless the card is already there).
  const formStatusOptions = columns.filter(
    (column) =>
      column.value === form.status ||
      column.value === (editingTask?.status ?? emptyStatus) ||
      !approvalColumn ||
      isMoveAllowed(editingTask?.status ?? emptyStatus, column.value),
  );

  const Icon = icon;
  const gridClass = `flex min-w-max gap-4 xl:grid xl:min-w-0 xl:gap-4 ${
    columns.length >= 5 ? "xl:grid-cols-5" : columns.length === 4 ? "xl:grid-cols-4" : "xl:grid-cols-3"
  }`;

  return (
    <div className="space-y-8">
      <PageHeader
        title={title}
        description={description}
        action={
          canCreate ? (
            <Button onClick={openCreateModal} className="w-full sm:w-auto">
              <Plus size={17} />
              Nova tarefa
            </Button>
          ) : null
        }
      />

      {filters}

      <p aria-live="polite" className="sr-only">
        {liveMessage}
      </p>

      {isLoading ? (
        <KanbanSkeleton areaLabel={areaLabel} columns={columns} gridClass={gridClass} />
      ) : (
        <CardContext.Provider value={cardContext}>
        <DndContext
          collisionDetection={pointerFirstCollision}
          onDragCancel={() => {
            setActiveTaskId(null);
            setOverColumn(null);
          }}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDragStart={handleDragStart}
          sensors={sensors}
        >
          <section className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 xl:overflow-visible">
            <div className={gridClass}>
              {columns.map((column) => (
                <Column
                  canUpdate={canUpdate}
                  isNarrow={isNarrow}
                  quickCreate={
                    quickCreateStatuses.includes(column.value)
                      ? {
                          isOpen: quickCreateColumn === column.value,
                          onOpen: () => setQuickCreateColumn(column.value),
                          onClose: () => setQuickCreateColumn((current) => (current === column.value ? null : current)),
                          onSubmit: (title) => quickCreate(title, column.value),
                        }
                      : undefined
                  }
                  column={column}
                  dropState={dropStateFor(column.value)}
                  highlightedIds={highlightedIds}
                  icon={Icon}
                  key={column.value}
                  landedId={landedId}
                  locked={scheduledColumn === column.value}
                  tasks={columnTasks(column.value)}
                  onCardClick={openViewModal}
                />
              ))}
            </div>
          </section>
          <DragOverlay dropAnimation={dropAnimation}>
            {activeTask ? (
              <div
                className="rotate-2 scale-[1.03] animate-kanban-lift rounded-lg"
                style={{ width: activeWidth ?? undefined }}
              >
                <TaskCard isOverlay task={activeTask} onCardClick={() => undefined} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
        </CardContext.Provider>
      )}

      <Modal
        isOpen={Boolean(viewTask)}
        onClose={() => setViewTask(null)}
        title={viewTask?.title ?? "Detalhes da tarefa"}
      >
        {viewTask ? (
          <div className="space-y-5">
            <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2">
              <p><strong className="text-pegasus-navy">Status:</strong> {statusLabel(viewTask.status)}</p>
              <p>
                <strong className="text-pegasus-navy">Responsável:</strong>{" "}
                {normalizeList(viewTask.assignedTo).map((name) => peopleLabels.get(name) ?? name).join(", ") || "-"}
              </p>
              <p><strong className="text-pegasus-navy">Prazo:</strong> {formatDate(viewTask.dueDate)}</p>
              <p><strong className="text-pegasus-navy">Prioridade:</strong> {priorityLabel(viewTask.priority)}</p>
              {viewFormat ? (
                <p><strong className="text-pegasus-navy">Formato:</strong> {viewFormat.label}</p>
              ) : null}
              {viewTask.channel ? (
                <p>
                  <strong className="text-pegasus-navy">Canal:</strong>{" "}
                  {channelsByValue.get(viewTask.channel)?.label ?? viewTask.channel}
                </p>
              ) : null}
              <p><strong className="text-pegasus-navy">Atualizada em:</strong> {formatDate(viewTask.updatedAt)}</p>
            </div>

            <section className="rounded-2xl border border-stone-200 bg-white p-4">
              <h3 className="font-black text-pegasus-navy">Descrição</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {viewTask.description || "Sem descrição."}
              </p>
            </section>

            {viewFormat && viewFormat.stages.length > 0 ? (
              <section className="rounded-2xl border border-stone-200 bg-white p-4">
                <h3 className="font-black text-pegasus-navy">Esteira · {viewFormat.label}</h3>
                <p className="mb-3 mt-1 text-xs text-slate-500">
                  Sub-etapas da Produção. Toque numa etapa para marcar até ela.
                </p>
                <StageTrack
                  canUpdate={canUpdate}
                  done={normalizeList(viewTask.stagesDone)}
                  stages={viewFormat.stages}
                  onChange={(next) => void changeStages(viewTask.id, next)}
                />
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                  {viewFormat.stages.map((stage) => (
                    <span
                      className={`text-xs font-semibold ${
                        normalizeList(viewTask.stagesDone).includes(stage.key) ? "text-emerald-700 dark:text-emerald-400" : "text-slate-400"
                      }`}
                      key={stage.key}
                    >
                      {stage.label}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="rounded-2xl border border-stone-200 bg-white p-4">
              <h3 className="font-black text-pegasus-navy">Etiquetas</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {normalizeList(viewTask.labels).length > 0 ? normalizeList(viewTask.labels).map((label) => (
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${labelClass(label)}`} key={label}>
                    {label}
                  </span>
                )) : <p className="text-sm text-slate-500">Sem etiquetas.</p>}
              </div>
            </section>

            <section className="rounded-2xl border border-stone-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-pegasus-navy">Checklist</h3>
                {normalizeList(viewTask.checklist).length > 0 ? (
                  <span className="text-xs font-bold text-slate-400">
                    <AnimatedCount value={normalizeList(viewTask.checklist).filter((item) => item.done).length} />/
                    {normalizeList(viewTask.checklist).length}
                  </span>
                ) : null}
              </div>
              {normalizeList(viewTask.checklist).length > 0 ? (
                <ChecklistProgress
                  done={normalizeList(viewTask.checklist).filter((item) => item.done).length}
                  total={normalizeList(viewTask.checklist).length}
                />
              ) : null}
              <div className="mt-3 space-y-1">
                {normalizeList(viewTask.checklist).length > 0 ? normalizeList(viewTask.checklist).map((item) => (
                  <label
                    className={`flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm text-slate-600 ${canUpdate ? "cursor-pointer hover:bg-pegasus-surface" : ""}`}
                    key={item.id}
                  >
                    <ChecklistCheckbox
                      checked={item.done}
                      disabled={!canUpdate}
                      onChange={(checked) => toggleViewChecklistItem(item.id, checked)}
                    />
                    <span className={`transition-colors duration-200 ${item.done ? "text-slate-400 line-through" : ""}`}>
                      {item.text}
                    </span>
                  </label>
                )) : <p className="text-sm text-slate-500">Sem itens.</p>}
              </div>
            </section>

            {columns.length > 1 ? (
              <section className="rounded-2xl border border-stone-200 bg-white p-4">
                <h3 className="font-black text-pegasus-navy">Mover para</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Alternativa ao arrastar o card — útil no celular ou pelo teclado.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {columns.map((column) => {
                    const isCurrent = viewTask.status === column.value;
                    const disabled = !canUpdate || isCurrent || !isMoveAllowed(viewTask.status, column.value);
                    return (
                      <button
                        className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                          isCurrent
                            ? "border-pegasus-primary bg-pegasus-primary text-white"
                            : "border-stone-200 text-slate-600 hover:border-pegasus-sky hover:bg-pegasus-surface"
                        } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
                        disabled={disabled}
                        key={column.value}
                        onClick={() => handleMoveTo(viewTask, column.value)}
                        type="button"
                      >
                        {column.label}
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}

            <TaskActivity
              canComment={canUpdate}
              comments={normalizeList(viewTask.comments)}
              formatLabel={(value) => formatsByValue.get(value)?.label ?? value}
              loadHistory={loadHistory ? () => loadHistory(viewTask) : undefined}
              people={(responsibleOptions ?? []).map((option) => ({ name: option.value, label: option.label }))}
              refreshKey={`${viewTask.id}:${viewTask.updatedAt}:${viewTask.status}`}
              statusLabel={statusLabel}
              onAddComment={
                onAddComment
                  ? async (text) => {
                      touch(viewTask.id);
                      try {
                        await onAddComment(viewTask, text);
                        return true;
                      } catch {
                        return false;
                      }
                    }
                  : undefined
              }
            />
            <p className="text-xs text-slate-400">
              Criada em {formatDate(viewTask.createdAt)}. Última atualização em {formatDate(viewTask.updatedAt)}.
            </p>

            {scheduledColumn && viewTask.status === scheduledColumn && viewTask.scheduledAt ? (
              <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4">
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-amber-700">Publicação agendada</p>
                <ScheduledBadge scheduledAt={viewTask.scheduledAt} />
                {canApprove && onApprove ? (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Button
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handlePublishNow(viewTask)}
                    >
                      Publicar agora
                    </Button>
                    {onReject ? (
                      <Button className="flex-1" onClick={() => handleReject(viewTask)} variant="secondary">
                        Desagendar
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-amber-800">
                    Já aprovado. Para mudar o conteúdo, peça a quem aprova para desagendar.
                  </p>
                )}
              </div>
            ) : null}

            {canApprove && approvalColumn && viewTask.status === approvalColumn && onApprove && onReject ? (
              <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4">
                <p className="mb-3 text-sm font-black text-amber-800">Aguardando aprovação</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    onClick={() => { setApprovalTask(viewTask); setApprovalMode("publish"); }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  >
                    Aprovar
                  </Button>
                  <Button
                    onClick={() => handleReject(viewTask)}
                    variant="danger"
                    className="flex-1"
                  >
                    Reprovar
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              {canUpdate && !(scheduledColumn && viewTask.status === scheduledColumn && !canApprove) ? (
                <Button onClick={() => openEditModal(viewTask)} variant="secondary">
                  Editar
                </Button>
              ) : null}
              {canDelete ? (
                <Button onClick={() => setDeleteTarget(viewTask)} variant="danger">
                  <Trash2 size={17} />
                  Excluir
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingTask ? "Editar tarefa" : "Nova tarefa"}
      >
        {labelsAsTab ? (
          <div className="mb-4 flex gap-2 rounded-xl border border-stone-200 bg-pegasus-surface p-1">
            {(["detalhes", "etiquetas"] as const).map((tab) => (
              <button
                className={`rounded-lg px-4 py-1.5 text-sm font-bold transition ${
                  formTab === tab ? "bg-white shadow-sm text-pegasus-primary" : "text-slate-500 hover:text-pegasus-primary"
                }`}
                key={tab}
                onClick={() => setFormTab(tab)}
                type="button"
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        ) : null}

        <form className="grid gap-4" onSubmit={handleSubmit}>
          {(!labelsAsTab || formTab === "detalhes") ? (
            <>
              <Input
                disabled={isSaving}
                label="Título"
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                required
                value={form.title}
              />
              <Textarea
                disabled={isSaving}
                label="Descrição"
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                value={form.description}
              />
              <div>
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">Responsáveis</span>
                {responsibleOptions ? (
                  <div className="grid gap-1 sm:grid-cols-2">
                    {[
                      ...responsibleOptions,
                      // People already on the card but no longer in the team list stay removable.
                      ...form.assignedTo
                        .filter((name) => !responsibleOptions.some((option) => option.value === name))
                        .map((name) => ({ label: name, value: name })),
                    ].map((option) => {
                      const checked = form.assignedTo.includes(option.value);
                      const [personName, ...roleParts] = option.label.split(" — ");
                      const role = roleParts.join(" — ");
                      return (
                        <label
                          className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
                            checked
                              ? "border-emerald-300 bg-emerald-50/60 text-pegasus-navy dark:border-emerald-800 dark:bg-emerald-950/30"
                              : "border-stone-200 text-slate-600 hover:bg-pegasus-surface dark:border-slate-700"
                          } ${isSaving ? "cursor-not-allowed opacity-60" : ""}`}
                          key={option.value}
                        >
                          <ChecklistCheckbox
                            checked={checked}
                            disabled={isSaving}
                            onChange={() => toggleAssignee(option.value)}
                          />
                          <span className="min-w-0 leading-tight">
                            <span className="block font-semibold">{personName}</span>
                            {role ? <span className="block text-xs text-slate-500">{role}</span> : null}
                          </span>
                        </label>
                      );
                    })}
                    {responsibleOptions.length === 0 && form.assignedTo.length === 0 ? (
                      <p className="text-xs text-slate-400">Nenhuma pessoa na equipe ainda.</p>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {form.assignedTo.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {form.assignedTo.map((name) => (
                          <button
                            className="rounded-full border border-pegasus-primary bg-pegasus-ice px-3 py-1 text-xs font-bold text-pegasus-primary"
                            key={name}
                            onClick={() => toggleAssignee(name)}
                            type="button"
                          >
                            {name} ×
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <Input
                          disabled={isSaving}
                          label="Nome do responsável"
                          onChange={(event) => setAssigneeInput(event.target.value)}
                          placeholder="Digite e clique em Adicionar"
                          value={assigneeInput}
                        />
                      </div>
                      <Button disabled={isSaving} onClick={addAssigneeFreeText} type="button" variant="secondary">
                        Adicionar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  disabled={isSaving}
                  label="Prazo"
                  min={minDueDate}
                  onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
                  type="date"
                  value={form.dueDate}
                />
                {formatOptions ? (
                  <Select
                    disabled={isSaving}
                    label="Formato"
                    onChange={(event) => {
                      const nextFormat = formatsByValue.get(event.target.value);
                      setForm({
                        ...form,
                        format: event.target.value,
                        // A new format means a new track; its channel is cleared when it doesn't apply.
                        stagesDone: event.target.value === form.format ? form.stagesDone : [],
                        channel: nextFormat && !nextFormat.showChannel ? "" : form.channel,
                      });
                    }}
                    options={[
                      { label: "Escolha o formato", value: "" },
                      ...formatOptions.map((option) => ({ label: option.label, value: option.value })),
                    ]}
                    value={form.format ?? ""}
                  />
                ) : null}
                {showChannelField && channelOptions ? (
                  <Select
                    disabled={isSaving}
                    label="Canal"
                    onChange={(event) => setForm({ ...form, channel: event.target.value })}
                    options={[
                      ...(formatOptions ? [{ label: "Sem canal", value: "" }] : []),
                      ...channelOptions.map((option) => ({ label: option.label, value: option.value })),
                    ]}
                    value={form.channel ?? ""}
                  />
                ) : null}
                <Select
                  disabled={isSaving}
                  label="Prioridade"
                  onChange={(event) => setForm({ ...form, priority: event.target.value as TaskForm<TStatus>["priority"] })}
                  options={[
                    { label: "Baixa", value: "baixa" },
                    { label: "Média", value: "media" },
                    { label: "Alta", value: "alta" },
                  ]}
                  value={form.priority}
                />
                <Select
                  disabled={isSaving}
                  label="Status"
                  onChange={(event) => setForm({ ...form, status: event.target.value as TStatus })}
                  options={formStatusOptions.map((item) => ({ label: item.label, value: item.value }))}
                  value={form.status}
                />
              </div>

              {!labelsAsTab ? (
                <section className="rounded-2xl border border-stone-200 p-4">
                  <div className="flex items-center gap-2">
                    <Tag className="text-pegasus-primary" size={18} />
                    <h3 className="font-black text-pegasus-navy">Etiquetas</h3>
                  </div>
                  {savedLabels && savedLabels.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {savedLabels.filter((label) => !form.labels.includes(label)).map((label) => (
                        <button
                          className="rounded-full border border-dashed border-stone-300 px-3 py-1 text-xs font-bold text-slate-500 hover:border-pegasus-sky hover:text-pegasus-primary"
                          key={label}
                          onClick={() => addLabelValue(label)}
                          type="button"
                        >
                          + {label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {form.labels.map((label) => (
                      <button
                        className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${labelClass(label)}`}
                        key={label}
                        onClick={() => removeLabel(label)}
                        type="button"
                      >
                        {label} x
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Input label="Nova etiqueta" onChange={(event) => setLabelInput(event.target.value)} value={labelInput} />
                    <Button className="sm:mt-7" onClick={addLabel} variant="secondary">
                      Adicionar
                    </Button>
                  </div>
                </section>
              ) : null}

              {/* Boards with the details-modal composer comment there (with @mentions), not in the form. */}
              {!onAddComment ? (
              <section className="rounded-2xl border border-stone-200 p-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="text-pegasus-primary" size={18} />
                  <h3 className="font-black text-pegasus-navy">Comentários</h3>
                </div>
                <div className="mt-3 space-y-2">
                  {form.comments.map((comment) => (
                    <div className="rounded-2xl bg-pegasus-surface p-3 text-sm" key={comment.id}>
                      <p className="font-bold text-pegasus-navy">{comment.author || "Pegasus"}</p>
                      <p className="mt-1 text-slate-600">{comment.text}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Input label="Novo comentário" onChange={(event) => setCommentInput(event.target.value)} value={commentInput} />
                  <Button className="sm:mt-7" onClick={addComment} variant="secondary">
                    Adicionar
                  </Button>
                </div>
              </section>
              ) : null}

              <section className="rounded-2xl border border-stone-200 p-4">
                <div className="flex items-center gap-2">
                  <CheckSquare className="text-pegasus-primary" size={18} />
                  <h3 className="font-black text-pegasus-navy">Checklist</h3>
                </div>
                <div className="mt-3 space-y-2">
                  {form.checklist.map((item) => (
                    <label className="flex items-center gap-3 text-sm text-slate-600" key={item.id}>
                      <ChecklistCheckbox
                        checked={item.done}
                        onChange={(checked) =>
                          setForm({
                            ...form,
                            checklist: form.checklist.map((check) =>
                              check.id === item.id ? { ...check, done: checked } : check,
                            ),
                          })
                        }
                      />
                      <span className={`transition-colors duration-200 ${item.done ? "text-slate-400 line-through" : ""}`}>
                        {item.text}
                      </span>
                      <button
                        className="ml-auto text-xs font-bold text-rose-600"
                        onClick={() =>
                          setForm({ ...form, checklist: form.checklist.filter((check) => check.id !== item.id) })
                        }
                        type="button"
                      >
                        Remover
                      </button>
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Input label="Novo item" onChange={(event) => setChecklistInput(event.target.value)} value={checklistInput} />
                  <Button className="sm:mt-7" onClick={addChecklistItem} variant="secondary">
                    Adicionar
                  </Button>
                </div>
              </section>
            </>
          ) : null}

          {labelsAsTab && formTab === "etiquetas" ? (
            <section className="rounded-2xl border border-stone-200 p-4">
              <div className="flex items-center gap-2">
                <Tag className="text-pegasus-primary" size={18} />
                <h3 className="font-black text-pegasus-navy">Etiquetas</h3>
              </div>
              {savedLabels && savedLabels.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="w-full text-xs font-bold uppercase tracking-wide text-slate-400">Sugeridas</span>
                  {savedLabels.filter((label) => !form.labels.includes(label)).map((label) => (
                    <button
                      className="rounded-full border border-dashed border-stone-300 px-3 py-1 text-xs font-bold text-slate-500 hover:border-pegasus-sky hover:text-pegasus-primary"
                      key={label}
                      onClick={() => addLabelValue(label)}
                      type="button"
                    >
                      + {label}
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {form.labels.map((label) => (
                  <button
                    className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${labelClass(label)}`}
                    key={label}
                    onClick={() => removeLabel(label)}
                    type="button"
                  >
                    {label} x
                  </button>
                ))}
                {form.labels.length === 0 ? <p className="text-sm text-slate-500">Nenhuma etiqueta adicionada.</p> : null}
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Input label="Nova etiqueta" onChange={(event) => setLabelInput(event.target.value)} value={labelInput} />
                <Button className="sm:mt-7" onClick={addLabel} variant="secondary">
                  Adicionar
                </Button>
              </div>
            </section>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button disabled={isSaving} type="submit">
              {isSaving ? <Loader2 className="animate-spin" size={17} /> : null}
              {editingTask ? "Salvar alterações" : "Criar tarefa"}
            </Button>
            <Button disabled={isSaving} onClick={() => setIsFormOpen(false)} variant="secondary">
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(approvalTask)}
        onClose={() => { setApprovalTask(null); setApprovalMode(null); }}
        title="Aprovar tarefa"
      >
        {approvalTask ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Como deseja aprovar <strong className="text-pegasus-navy">{approvalTask.title}</strong>?
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                className={`rounded-2xl border-2 p-4 text-left transition ${approvalMode === "publish" ? "border-stone-900 bg-stone-100" : "border-stone-200 hover:border-stone-400"}`}
                onClick={() => setApprovalMode("publish")}
                type="button"
              >
                <p className="font-black text-pegasus-navy">Publicado</p>
                <p className="mt-1 text-sm text-slate-500">Mover diretamente para publicado.</p>
              </button>
              <button
                className={`rounded-2xl border-2 p-4 text-left transition ${approvalMode === "schedule" ? "border-stone-900 bg-stone-100" : "border-stone-200 hover:border-stone-400"}`}
                onClick={() => setApprovalMode("schedule")}
                type="button"
              >
                <p className="font-black text-pegasus-navy">Agendado</p>
                <p className="mt-1 text-sm text-slate-500">Definir data e hora para publicar.</p>
              </button>
            </div>
            {approvalMode === "schedule" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Data de publicação"
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  required
                  type="date"
                  value={scheduledDate}
                />
                <Input
                  label="Horário"
                  onChange={(e) => setScheduledTime(e.target.value)}
                  type="time"
                  value={scheduledTime}
                />
              </div>
            ) : null}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                disabled={!approvalMode || isSaving || (approvalMode === "schedule" && !scheduledDate)}
                onClick={handleApproveConfirm}
              >
                {isSaving ? <Loader2 className="animate-spin" size={17} /> : null}
                Confirmar aprovação
              </Button>
              <Button onClick={() => { setApprovalTask(null); setApprovalMode(null); }} variant="secondary">
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        confirmLabel={isSaving ? "Excluindo..." : "Excluir tarefa"}
        description={`Deseja excluir "${deleteTarget?.title ?? "esta tarefa"}"?`}
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Confirmar exclusão"
      />
    </div>
  );
}
