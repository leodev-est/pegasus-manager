import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarClock,
  CheckSquare,
  Clock,
  GripVertical,
  Loader2,
  MessageSquare,
  Plus,
  Tag,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { EmptyState } from "../ui/EmptyState";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { PageHeader } from "../ui/PageHeader";
import { Select } from "../ui/Select";
import { StatusBadge, type StatusTone } from "../ui/StatusBadge";
import { Textarea } from "../ui/Textarea";

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
  assignedTo: string | null;
  dueDate: string | null;
  priority: "baixa" | "media" | "alta";
  channel?: string | null;
  labels?: string[];
  comments?: KanbanComment[];
  checklist?: KanbanChecklistItem[];
  approvalStatus?: string | null;
  scheduledAt?: string | null;
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

type TaskForm<TStatus extends string> = {
  title: string;
  description: string;
  assignedTo: string;
  dueDate: string;
  priority: "baixa" | "media" | "alta";
  status: TStatus;
  channel?: string;
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
  channelOptions?: ChannelOption[];
  responsibleOptions?: ChannelOption[];
  minDueDate?: string;
  labelsAsTab?: boolean;
  approvalColumn?: TStatus;
  scheduledColumn?: TStatus;
  canApprove?: boolean;
  emptyStatus: TStatus;
  onCreate: (payload: TaskForm<TStatus>) => Promise<void>;
  onUpdate: (task: TTask, payload: TaskForm<TStatus>) => Promise<void>;
  onDelete: (task: TTask) => Promise<void>;
  onMove: (task: TTask, status: TStatus) => Promise<void>;
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
  return "info";
}

function formatDate(value?: string | null) {
  if (!value) return "Sem prazo";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(value));
}

function isOverdue(value?: string | null) {
  if (!value) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(`${value.slice(0, 10)}T00:00:00.000`);
  return dueDate < today;
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
    assignedTo: task.assignedTo ?? "",
    dueDate: toInputDate(task.dueDate),
    priority: task.priority,
    status: (task.status as TStatus) ?? fallbackStatus,
    channel: task.channel ?? "",
    labels: normalizeList(task.labels),
    comments: normalizeList(task.comments),
    checklist: normalizeList(task.checklist),
  };
}

function emptyForm<TStatus extends string>(status: TStatus, channel?: string): TaskForm<TStatus> {
  return {
    title: "",
    description: "",
    assignedTo: "",
    dueDate: "",
    priority: "media",
    status,
    channel,
    labels: [],
    comments: [],
    checklist: [],
  };
}

function Column<TTask extends KanbanTaskBase, TStatus extends string>({
  canUpdate,
  column,
  icon: Icon,
  isOver,
  locked,
  statusLabel,
  tasks,
  onCardClick,
}: {
  canUpdate: boolean;
  column: ColumnConfig<TStatus>;
  icon: LucideIcon;
  isOver: boolean;
  locked?: boolean;
  statusLabel: (status: string) => string;
  tasks: TTask[];
  onCardClick: (task: TTask) => void;
}) {
  const { setNodeRef } = useDroppable({ id: `column:${column.value}` });

  return (
    <div
      className={`w-[84vw] max-w-sm shrink-0 rounded-2xl border p-3 transition sm:w-80 xl:w-auto xl:max-w-none ${
        isOver ? "border-pegasus-sky bg-blue-100/80 shadow-md" : "border-blue-100 bg-blue-50/60"
      }`}
      ref={setNodeRef}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="text-pegasus-primary" size={19} />
          <h2 className="font-bold text-pegasus-navy">{column.label}</h2>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-pegasus-primary">
          {tasks.length}
        </span>
      </div>
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="min-h-36 space-y-3">
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <SortableTaskCard
                canUpdate={canUpdate && !locked}
                key={task.id}
                statusLabel={statusLabel}
                task={task}
                onCardClick={onCardClick}
              />
            ))
          ) : (
            <EmptyState description="Arraste uma tarefa para esta coluna." icon={Icon} title="Coluna vazia" />
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableTaskCard<TTask extends KanbanTaskBase>({
  canUpdate,
  statusLabel,
  task,
  onCardClick,
}: {
  canUpdate: boolean;
  statusLabel: (status: string) => string;
  task: TTask;
  onCardClick: (task: TTask) => void;
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: task.id,
    disabled: !canUpdate,
    data: { status: task.status },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TaskCard
      dragAttributes={attributes as unknown as Record<string, unknown>}
      dragListeners={listeners as unknown as Record<string, (...event: unknown[]) => void>}
      isDragging={isDragging}
      refCallback={setNodeRef}
      statusLabel={statusLabel}
      style={style}
      task={task}
      onCardClick={onCardClick}
    />
  );
}

function TaskCard<TTask extends KanbanTaskBase>({
  dragAttributes,
  dragListeners,
  isDragging = false,
  refCallback,
  statusLabel,
  style,
  task,
  onCardClick,
}: {
  dragAttributes?: Record<string, unknown>;
  dragListeners?: Record<string, (...event: unknown[]) => void>;
  isDragging?: boolean;
  refCallback?: (node: HTMLElement | null) => void;
  statusLabel: (status: string) => string;
  style?: CSSProperties;
  task: TTask;
  onCardClick: (task: TTask) => void;
}) {
  const labels = normalizeList(task.labels);
  const checklist = normalizeList(task.checklist);
  const comments = normalizeList(task.comments);
  const doneItems = checklist.filter((item) => item.done).length;
  const overdue = isOverdue(task.dueDate);

  return (
    <article
      className={`rounded-2xl border border-blue-100 bg-white p-4 shadow-sm transition ${
        isDragging ? "scale-[1.02] opacity-70 shadow-xl" : "hover:-translate-y-0.5 hover:shadow-md"
      }`}
      ref={refCallback}
      style={style}
    >
      <div className="flex items-start gap-3">
        <button
          aria-label="Arrastar tarefa"
          className="mt-0.5 grid h-8 w-8 shrink-0 cursor-grab place-items-center rounded-xl bg-pegasus-surface text-slate-500 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!dragListeners}
          type="button"
          {...dragAttributes}
          {...dragListeners}
        >
          <GripVertical size={16} />
        </button>
        <button className="min-w-0 flex-1 text-left" onClick={() => onCardClick(task)} type="button">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-bold text-pegasus-navy">{task.title}</h3>
            <StatusBadge label={statusLabel(task.status)} tone="info" />
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{truncate(task.description)}</p>
        </button>
      </div>

      {labels.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {labels.map((label) => (
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${labelClass(label)}`}
              key={label}
            >
              {label}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {task.channel ? (
          <span className="rounded-full bg-pegasus-surface px-3 py-1 text-xs font-bold text-slate-600">
            {task.channel}
          </span>
        ) : null}
        <span className="rounded-full bg-pegasus-surface px-3 py-1 text-xs font-bold text-slate-600">
          {task.assignedTo ?? "Sem responsável"}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
            overdue ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200" : "bg-pegasus-surface text-slate-600"
          }`}
        >
          <CalendarClock size={13} />
          {formatDate(task.dueDate)}
        </span>
        <StatusBadge label={priorityLabel(task.priority)} tone={priorityTone(task.priority)} />
      </div>

      <div className="mt-4 flex items-center gap-3 text-xs font-bold text-slate-500">
        <span className="inline-flex items-center gap-1">
          <MessageSquare size={14} />
          {comments.length}
        </span>
        <span className="inline-flex items-center gap-1">
          <CheckSquare size={14} />
          {doneItems}/{checklist.length}
        </span>
      </div>

      {task.scheduledAt && task.status === "scheduled" ? (
        <div className="mt-3">
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
  onMove,
  onReject,
  onUpdate,
  responsibleOptions,
  tasks,
  title,
}: AdvancedKanbanProps<TTask, TStatus>) {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
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
    emptyForm(emptyStatus, channelOptions?.[0]?.value),
  );
  const [labelInput, setLabelInput] = useState("");
  const [commentInput, setCommentInput] = useState("");
  const [checklistInput, setChecklistInput] = useState("");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 8 } }),
  );
  const activeTask = useMemo(
    () => tasks.find((task) => task.id === activeTaskId) ?? null,
    [activeTaskId, tasks],
  );

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
    setForm(emptyForm(emptyStatus, channelOptions?.[0]?.value));
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
    await onApprove(approvalTask, approvalMode, scheduledAt);
    setApprovalTask(null);
    setApprovalMode(null);
    setScheduledDate("");
    setScheduledTime("");
    setViewTask(null);
  }

  async function handleReject(task: TTask) {
    if (!onReject) return;
    await onReject(task);
    setViewTask(null);
  }

  async function handlePublishNow(task: TTask) {
    if (!onApprove) return;
    await onApprove(task, "publish");
    setViewTask(null);
  }

  function openViewModal(task: TTask) {
    setViewTask(task);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveTaskId(String(event.active.id));
  }

  function handleDragOver(event: DragEndEvent) {
    const overId = event.over?.id ? String(event.over.id) : null;
    const nextColumn = overId?.startsWith("column:")
      ? overId.replace("column:", "")
      : tasks.find((task) => task.id === overId)?.status ?? null;

    setOverColumn(nextColumn);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setOverColumn(null);
    setActiveTaskId(null);

    if (!canUpdate) return;

    const active = tasks.find((task) => task.id === String(event.active.id));
    const overId = event.over?.id ? String(event.over.id) : "";

    if (!active || !overId) return;

    const nextStatus = overId.startsWith("column:")
      ? overId.replace("column:", "")
      : tasks.find((task) => task.id === overId)?.status;

    if (!nextStatus || nextStatus === active.status) return;

    // Block dragging from the scheduled column entirely
    if (scheduledColumn && active.status === scheduledColumn) return;

    // Block dragging out of the approval column — must go through the approval flow
    if (approvalColumn) {
      const approvalIdx = columns.findIndex((c) => c.value === approvalColumn);
      const nextIdx = columns.findIndex((c) => c.value === nextStatus);
      if (active.status === approvalColumn && nextIdx > approvalIdx) return;
    }

    await onMove(active, nextStatus as TStatus);
  }

  function addLabel() {
    const nextLabel = labelInput.trim();
    if (!nextLabel || form.labels.includes(nextLabel)) return;
    setForm({ ...form, labels: [...form.labels, nextLabel] });
    setLabelInput("");
  }

  function removeLabel(label: string) {
    setForm({ ...form, labels: form.labels.filter((item) => item !== label) });
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
      await onUpdate(editingTask, form);
    } else {
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

  const Icon = icon;

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

      {isLoading ? (
        <div className="panel flex items-center gap-3 p-6 text-sm font-bold text-pegasus-primary">
          <Loader2 className="animate-spin" size={18} />
          Carregando {areaLabel}
        </div>
      ) : (
        <DndContext
          collisionDetection={closestCenter}
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
            <div
              className={`flex min-w-max gap-4 xl:grid xl:min-w-0 xl:gap-4 ${
                columns.length >= 5 ? "xl:grid-cols-5" : columns.length === 4 ? "xl:grid-cols-4" : "xl:grid-cols-3"
              }`}
            >
              {columns.map((column) => (
                <Column
                  canUpdate={canUpdate}
                  column={column}
                  icon={Icon}
                  isOver={overColumn === column.value}
                  key={column.value}
                  locked={scheduledColumn === column.value}
                  statusLabel={statusLabel}
                  tasks={tasks.filter((task) => task.status === column.value)}
                  onCardClick={openViewModal}
                />
              ))}
            </div>
          </section>
          <DragOverlay>
            {activeTask ? (
              <div className="w-80">
                <TaskCard statusLabel={statusLabel} task={activeTask} onCardClick={() => undefined} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
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
              <p><strong className="text-pegasus-navy">Responsável:</strong> {viewTask.assignedTo ?? "-"}</p>
              <p><strong className="text-pegasus-navy">Prazo:</strong> {formatDate(viewTask.dueDate)}</p>
              <p><strong className="text-pegasus-navy">Prioridade:</strong> {priorityLabel(viewTask.priority)}</p>
              {viewTask.channel ? (
                <p><strong className="text-pegasus-navy">Canal:</strong> {viewTask.channel}</p>
              ) : null}
              <p><strong className="text-pegasus-navy">Atualizada em:</strong> {formatDate(viewTask.updatedAt)}</p>
            </div>

            <section className="rounded-2xl border border-blue-100 bg-white p-4">
              <h3 className="font-black text-pegasus-navy">Descrição</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {viewTask.description || "Sem descrição."}
              </p>
            </section>

            <section className="rounded-2xl border border-blue-100 bg-white p-4">
              <h3 className="font-black text-pegasus-navy">Etiquetas</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {normalizeList(viewTask.labels).length > 0 ? normalizeList(viewTask.labels).map((label) => (
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${labelClass(label)}`} key={label}>
                    {label}
                  </span>
                )) : <p className="text-sm text-slate-500">Sem etiquetas.</p>}
              </div>
            </section>

            <section className="rounded-2xl border border-blue-100 bg-white p-4">
              <h3 className="font-black text-pegasus-navy">Checklist</h3>
              <div className="mt-3 space-y-2">
                {normalizeList(viewTask.checklist).length > 0 ? normalizeList(viewTask.checklist).map((item) => (
                  <p className="flex items-center gap-2 text-sm text-slate-600" key={item.id}>
                    <span className={`h-4 w-4 rounded border ${item.done ? "border-emerald-500 bg-emerald-500" : "border-blue-200"}`} />
                    <span className={item.done ? "line-through" : ""}>{item.text}</span>
                  </p>
                )) : <p className="text-sm text-slate-500">Sem itens.</p>}
              </div>
            </section>

            <section className="rounded-2xl border border-blue-100 bg-white p-4">
              <h3 className="font-black text-pegasus-navy">Histórico e comentários</h3>
              <div className="mt-3 space-y-3">
                <p className="text-sm text-slate-500">
                  Criada em {formatDate(viewTask.createdAt)}. Última atualização em {formatDate(viewTask.updatedAt)}.
                </p>
                {normalizeList(viewTask.comments).map((comment) => (
                  <div className="rounded-2xl bg-pegasus-surface p-3 text-sm" key={comment.id}>
                    <p className="font-bold text-pegasus-navy">{comment.author || "Pegasus"}</p>
                    <p className="mt-1 text-slate-600">{comment.text}</p>
                    <p className="mt-2 text-xs text-slate-400">{formatDate(comment.createdAt)}</p>
                  </div>
                ))}
              </div>
            </section>

            {scheduledColumn && viewTask.status === scheduledColumn && viewTask.scheduledAt ? (
              <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4">
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-amber-700">Publicação agendada</p>
                <ScheduledBadge scheduledAt={viewTask.scheduledAt} />
                {canApprove && onApprove ? (
                  <Button
                    className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handlePublishNow(viewTask)}
                  >
                    Publicar agora
                  </Button>
                ) : null}
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
              {canUpdate ? (
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
          <div className="mb-4 flex gap-2 rounded-xl border border-blue-100 bg-pegasus-surface p-1">
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
              <div className="grid gap-4 md:grid-cols-2">
                {responsibleOptions ? (
                  <Select
                    disabled={isSaving}
                    label="Responsável"
                    onChange={(event) => setForm({ ...form, assignedTo: event.target.value })}
                    options={[{ label: "Sem responsável", value: "" }, ...responsibleOptions]}
                    value={form.assignedTo}
                  />
                ) : (
                  <Input
                    disabled={isSaving}
                    label="Responsável"
                    onChange={(event) => setForm({ ...form, assignedTo: event.target.value })}
                    value={form.assignedTo}
                  />
                )}
                <Input
                  disabled={isSaving}
                  label="Prazo"
                  min={minDueDate}
                  onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
                  type="date"
                  value={form.dueDate}
                />
                {channelOptions ? (
                  <Select
                    disabled={isSaving}
                    label="Canal"
                    onChange={(event) => setForm({ ...form, channel: event.target.value })}
                    options={channelOptions}
                    value={form.channel}
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
                  options={columns.map((item) => ({ label: item.label, value: item.value }))}
                  value={form.status}
                />
              </div>

              {!labelsAsTab ? (
                <section className="rounded-2xl border border-blue-100 p-4">
                  <div className="flex items-center gap-2">
                    <Tag className="text-pegasus-primary" size={18} />
                    <h3 className="font-black text-pegasus-navy">Etiquetas</h3>
                  </div>
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

              <section className="rounded-2xl border border-blue-100 p-4">
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

              <section className="rounded-2xl border border-blue-100 p-4">
                <div className="flex items-center gap-2">
                  <CheckSquare className="text-pegasus-primary" size={18} />
                  <h3 className="font-black text-pegasus-navy">Checklist</h3>
                </div>
                <div className="mt-3 space-y-2">
                  {form.checklist.map((item) => (
                    <label className="flex items-center gap-3 text-sm text-slate-600" key={item.id}>
                      <input
                        checked={item.done}
                        className="h-5 w-5 rounded border-blue-200 text-pegasus-primary"
                        onChange={(event) =>
                          setForm({
                            ...form,
                            checklist: form.checklist.map((check) =>
                              check.id === item.id ? { ...check, done: event.target.checked } : check,
                            ),
                          })
                        }
                        type="checkbox"
                      />
                      <span className={item.done ? "line-through" : ""}>{item.text}</span>
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
            <section className="rounded-2xl border border-blue-100 p-4">
              <div className="flex items-center gap-2">
                <Tag className="text-pegasus-primary" size={18} />
                <h3 className="font-black text-pegasus-navy">Etiquetas</h3>
              </div>
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
                className={`rounded-2xl border-2 p-4 text-left transition ${approvalMode === "publish" ? "border-pegasus-primary bg-blue-50" : "border-blue-100 hover:border-pegasus-primary"}`}
                onClick={() => setApprovalMode("publish")}
                type="button"
              >
                <p className="font-black text-pegasus-navy">Publicado</p>
                <p className="mt-1 text-sm text-slate-500">Mover diretamente para publicado.</p>
              </button>
              <button
                className={`rounded-2xl border-2 p-4 text-left transition ${approvalMode === "schedule" ? "border-pegasus-primary bg-blue-50" : "border-blue-100 hover:border-pegasus-primary"}`}
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
