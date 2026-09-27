import { CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { useToast } from "../../components/ui/Toast";
import { getApiErrorMessage } from "../../services/api";
import {
  contentItemService,
  type ContentItem,
  type ContentStatus,
  type WeekTeamEvent,
} from "../../services/contentItemService";
import { useAuth } from "../../auth/AuthContext";

const WEEKDAYS: Array<{ label: string; short: string }> = [
  { label: "Segunda", short: "SEG" },
  { label: "Terça", short: "TER" },
  { label: "Quarta", short: "QUA" },
  { label: "Quinta", short: "QUI" },
  { label: "Sexta", short: "SEX" },
  { label: "Sábado", short: "SÁB" },
  { label: "Domingo", short: "DOM" },
];

const STATUS_STEPS: Array<{ value: ContentStatus; label: string }> = [
  { value: "referencia", label: "Referência" },
  { value: "definido", label: "Definido" },
  { value: "gravado", label: "Gravado" },
  { value: "editado", label: "Editado" },
  { value: "postado", label: "Postado" },
];

const STATUS_LABEL: Record<ContentStatus, string> = {
  referencia: "Referência",
  definido: "Definido",
  gravado: "Gravado",
  editado: "Editado",
  postado: "Postado",
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysToKey(dateKey: string, days: number) {
  const d = new Date(`${dateKey}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
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

type ItemForm = {
  title: string;
  description: string;
  date: string;
  status: ContentStatus;
  assignedTo: string[];
};

function emptyForm(date: string): ItemForm {
  return { title: "", description: "", date, status: "referencia", assignedTo: [] };
}

function itemToForm(item: ContentItem): ItemForm {
  return {
    title: item.title,
    description: item.description ?? "",
    date: item.date.slice(0, 10),
    status: item.status,
    assignedTo: item.assignedTo,
  };
}

export function ContentCalendarPage() {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const canCreate = hasPermission(["marketing:create"]);
  const canUpdate = hasPermission(["marketing:update"]);
  const canDelete = hasPermission(["marketing:delete"]);

  const [anchorDate, setAnchorDate] = useState(todayKey);
  const [weekStart, setWeekStart] = useState<string | null>(null);
  const [items, setItems] = useState<ContentItem[]>([]);
  const [events, setEvents] = useState<WeekTeamEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [form, setForm] = useState<ItemForm>(() => emptyForm(todayKey()));
  const [assigneeInput, setAssigneeInput] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ContentItem | null>(null);

  async function load() {
    setIsLoading(true);
    try {
      const data = await contentItemService.getWeek(anchorDate);
      setWeekStart(data.weekStart);
      setItems(data.items);
      setEvents(data.events);
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorDate]);

  const weekDates = useMemo(() => {
    if (!weekStart) return [];
    return Array.from({ length: 7 }, (_, i) => addDaysToKey(weekStart, i));
  }, [weekStart]);

  const itemsByDate = useMemo(() => {
    const map: Record<string, ContentItem[]> = {};
    for (const item of items) {
      const key = item.date.slice(0, 10);
      (map[key] ??= []).push(item);
    }
    return map;
  }, [items]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, WeekTeamEvent[]> = {};
    for (const event of events) {
      const key = event.date.slice(0, 10);
      (map[key] ??= []).push(event);
    }
    return map;
  }, [events]);

  function openCreate(date: string) {
    setEditingItem(null);
    setForm(emptyForm(date));
    setAssigneeInput("");
    setIsModalOpen(true);
  }

  function openEdit(item: ContentItem) {
    setEditingItem(item);
    setForm(itemToForm(item));
    setAssigneeInput("");
    setIsModalOpen(true);
  }

  function addAssignee() {
    const name = assigneeInput.trim();
    if (!name || form.assignedTo.includes(name)) return;
    setForm({ ...form, assignedTo: [...form.assignedTo, name] });
    setAssigneeInput("");
  }

  function removeAssignee(name: string) {
    setForm({ ...form, assignedTo: form.assignedTo.filter((item) => item !== name) });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) {
      showToast("Informe um título.", "error");
      return;
    }

    setIsSaving(true);
    try {
      if (editingItem) {
        await contentItemService.update(editingItem.id, form);
        showToast("Item atualizado.", "success");
      } else {
        await contentItemService.create(form);
        showToast("Item adicionado à pauta.", "success");
      }
      setIsModalOpen(false);
      await load();
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function changeStatus(item: ContentItem, status: ContentStatus) {
    if (status === item.status || !canUpdate) return;
    try {
      await contentItemService.update(item.id, { status });
      await load();
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsSaving(true);
    try {
      await contentItemService.delete(deleteTarget.id);
      showToast("Item removido.", "success");
      setDeleteTarget(null);
      setIsModalOpen(false);
      await load();
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pauta de Conteúdo"
        description="Planeje os posts da semana dia a dia, do rascunho até publicado."
      />

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 p-4">
          <div className="flex items-center gap-2">
            <Button onClick={() => setAnchorDate(todayKey())} variant="secondary" className="h-9 px-3 text-xs">
              Hoje
            </Button>
            <Button onClick={() => setAnchorDate((d) => addDaysToKey(d, -7))} variant="secondary" className="h-9 w-9 px-0">
              <ChevronLeft size={16} />
            </Button>
            <Button onClick={() => setAnchorDate((d) => addDaysToKey(d, 7))} variant="secondary" className="h-9 w-9 px-0">
              <ChevronRight size={16} />
            </Button>
          </div>
          <h2 className="text-sm font-bold text-pegasus-navy">{formatRangeLabel(weekDates)}</h2>
        </div>

        {isLoading ? (
          <div className="p-6 text-sm font-bold text-pegasus-primary">Carregando pauta...</div>
        ) : (
          <div className="grid grid-cols-1 divide-y divide-stone-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-7">
            {weekDates.map((dateKey, i) => {
              const dayItems = itemsByDate[dateKey] ?? [];
              const dayEvents = eventsByDate[dateKey] ?? [];
              const isToday = dateKey === todayKey();
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
                        aria-label={`Novo item em ${WEEKDAYS[i].label}`}
                        className="grid h-6 w-6 place-items-center rounded-lg text-pegasus-primary hover:bg-pegasus-ice"
                        onClick={() => openCreate(dateKey)}
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

                    {dayItems.map((item) => {
                      const currentIdx = STATUS_STEPS.findIndex((s) => s.value === item.status);
                      return (
                        <div
                          className="card-interactive w-full cursor-pointer rounded-lg border border-stone-200 bg-white p-2 text-left"
                          key={item.id}
                          onClick={() => openEdit(item)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              openEdit(item);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <p className="truncate text-xs font-bold text-pegasus-navy">{item.title}</p>
                          <div className="mt-1.5 flex gap-0.5">
                            {STATUS_STEPS.map((step, stepIdx) => (
                              <button
                                aria-label={`Marcar como ${step.label}`}
                                className={`h-1.5 flex-1 rounded-full transition ${
                                  stepIdx <= currentIdx ? "bg-emerald-500" : "bg-stone-200 hover:bg-stone-300"
                                } ${canUpdate ? "" : "cursor-not-allowed"}`}
                                disabled={!canUpdate}
                                key={step.value}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  changeStatus(item, step.value);
                                }}
                                title={step.label}
                                type="button"
                              />
                            ))}
                          </div>
                          <p className="mt-1 text-[10px] font-semibold text-slate-400">{STATUS_LABEL[item.status]}</p>
                        </div>
                      );
                    })}

                    {dayItems.length === 0 && dayEvents.length === 0 ? (
                      <p className="text-[11px] text-slate-300">Nada planejado.</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? "Editar item" : "Novo item da pauta"}
        description={form.date ? `${WEEKDAYS[weekDates.indexOf(form.date)]?.label ?? ""} · ${formatDayLabel(form.date)}` : undefined}
      >
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <Input
            disabled={isSaving}
            label="Título"
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder="Ex: Vídeo de treino, Reels do jogo..."
            required
            value={form.title}
          />
          <Textarea
            disabled={isSaving}
            label="Descrição (opcional)"
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            value={form.description}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              disabled={isSaving}
              label="Data"
              onChange={(event) => setForm({ ...form, date: event.target.value })}
              type="date"
              value={form.date}
            />
            <Select
              disabled={isSaving}
              label="Status"
              onChange={(event) => setForm({ ...form, status: event.target.value as ContentStatus })}
              options={STATUS_STEPS.map((step) => ({ label: step.label, value: step.value }))}
              value={form.status}
            />
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">Responsáveis</span>
            {form.assignedTo.length > 0 ? (
              <div className="mb-2 flex flex-wrap gap-2">
                {form.assignedTo.map((name) => (
                  <button
                    className="rounded-full border border-pegasus-primary bg-pegasus-ice px-3 py-1 text-xs font-bold text-pegasus-primary"
                    key={name}
                    onClick={() => removeAssignee(name)}
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
                  label="Nome"
                  onChange={(event) => setAssigneeInput(event.target.value)}
                  placeholder="Digite e clique em Adicionar"
                  value={assigneeInput}
                />
              </div>
              <Button disabled={isSaving} onClick={addAssignee} type="button" variant="secondary">
                Adicionar
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button disabled={isSaving} type="submit">
              {editingItem ? "Salvar alterações" : "Adicionar à pauta"}
            </Button>
            <Button disabled={isSaving} onClick={() => setIsModalOpen(false)} type="button" variant="secondary">
              Cancelar
            </Button>
            {editingItem && canDelete ? (
              <Button
                className="sm:ml-auto"
                disabled={isSaving}
                onClick={() => setDeleteTarget(editingItem)}
                type="button"
                variant="danger"
              >
                <Trash2 size={16} />
                Excluir
              </Button>
            ) : null}
          </div>
        </form>
      </Modal>

      <Modal isOpen={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Excluir item">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Deseja remover <strong className="text-pegasus-navy">{deleteTarget?.title}</strong> da pauta?
          </p>
          <div className="flex gap-3">
            <Button disabled={isSaving} onClick={confirmDelete} variant="danger">
              {isSaving ? "Excluindo..." : "Excluir"}
            </Button>
            <Button disabled={isSaving} onClick={() => setDeleteTarget(null)} variant="secondary">
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
