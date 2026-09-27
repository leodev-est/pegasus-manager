import { CalendarDays, CheckSquare, Loader2, MapPin, Plus, Wallet } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { ActionButtons } from "../../components/ui/ActionButtons";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { StatusBadge, type StatusTone } from "../../components/ui/StatusBadge";
import { Textarea } from "../../components/ui/Textarea";
import { useToast } from "../../components/ui/Toast";
import { getApiErrorMessage } from "../../services/api";
import {
  eventService,
  type ClubEvent,
  type EventChecklistItem,
  type EventStatus,
} from "../../services/eventService";

const statusOptions: Array<{ label: string; value: EventStatus }> = [
  { label: "Planejamento", value: "planejamento" },
  { label: "Confirmado", value: "confirmado" },
  { label: "Realizado", value: "realizado" },
];

function statusLabel(status: EventStatus) {
  return statusOptions.find((o) => o.value === status)?.label ?? status;
}

function statusTone(status: EventStatus): StatusTone {
  if (status === "realizado") return "success";
  if (status === "confirmado") return "info";
  return "warning";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(
    new Date(value),
  );
}

function formatCurrency(value: number | null) {
  if (value === null) return null;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function makeId() {
  return `check-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type EventForm = {
  name: string;
  date: string;
  location: string;
  budget: string;
  vendors: string;
  status: EventStatus;
  checklist: EventChecklistItem[];
};

const emptyForm: EventForm = {
  name: "",
  date: "",
  location: "",
  budget: "",
  vendors: "",
  status: "planejamento",
  checklist: [],
};

function eventToForm(event: ClubEvent): EventForm {
  return {
    name: event.name,
    date: event.date.slice(0, 10),
    location: event.location ?? "",
    budget: event.budget !== null ? String(event.budget) : "",
    vendors: event.vendors ?? "",
    status: event.status,
    checklist: event.checklist,
  };
}

export function EventsPage() {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const canCreate = hasPermission(["marketing:create"]);
  const canUpdate = hasPermission(["marketing:update"]);
  const canDelete = hasPermission(["marketing:delete"]);

  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ClubEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClubEvent | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [checklistInput, setChecklistInput] = useState("");
  const [formErrors, setFormErrors] = useState<Partial<Record<"name" | "date", string>>>({});

  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      setEvents(await eventService.getAll());
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  function openCreateModal() {
    setEditingEvent(null);
    setForm(emptyForm);
    setFormErrors({});
    setChecklistInput("");
    setIsModalOpen(true);
  }

  function openEditModal(event: ClubEvent) {
    setEditingEvent(event);
    setForm(eventToForm(event));
    setFormErrors({});
    setChecklistInput("");
    setIsModalOpen(true);
  }

  function addChecklistItem() {
    const text = checklistInput.trim();
    if (!text) return;
    setForm({ ...form, checklist: [...form.checklist, { id: makeId(), text, done: false }] });
    setChecklistInput("");
  }

  function toggleChecklistItem(id: string) {
    setForm({
      ...form,
      checklist: form.checklist.map((item) => (item.id === id ? { ...item, done: !item.done } : item)),
    });
  }

  function removeChecklistItem(id: string) {
    setForm({ ...form, checklist: form.checklist.filter((item) => item.id !== id) });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const errors: typeof formErrors = {};
    if (!form.name.trim()) errors.name = "Informe o nome do evento.";
    if (!form.date) errors.date = "Informe a data.";
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSaving(true);
    try {
      const payload = {
        name: form.name,
        date: form.date,
        location: form.location || undefined,
        budget: form.budget ? Number(form.budget) : null,
        vendors: form.vendors || undefined,
        status: form.status,
        checklist: form.checklist,
      };

      if (editingEvent) {
        await eventService.update(editingEvent.id, payload);
        showToast("Evento atualizado.", "success");
      } else {
        await eventService.create(payload);
        showToast("Evento criado com sucesso.", "success");
      }
      setIsModalOpen(false);
      await loadEvents();
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsSaving(true);
    try {
      await eventService.delete(deleteTarget.id);
      showToast("Evento excluído.", "success");
      setDeleteTarget(null);
      await loadEvents();
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Eventos"
        description="Torneios, confraternizações e sessões de fotos do time — orçamento, fornecedores e checklist em um só lugar. Todo evento aparece automaticamente no calendário de treinos e na pauta de conteúdo."
        action={
          canCreate ? (
            <Button onClick={openCreateModal} className="w-full sm:w-auto">
              <Plus size={17} />
              Novo evento
            </Button>
          ) : undefined
        }
      />

      <section className="panel overflow-hidden">
        {isLoading ? (
          <div className="flex items-center gap-3 p-6 text-sm font-bold text-pegasus-primary">
            <Loader2 className="animate-spin" size={18} />
            Carregando eventos
          </div>
        ) : events.length > 0 ? (
          <div className="grid gap-3 p-4 sm:p-6 lg:grid-cols-2">
            {events.map((event) => {
              const doneCount = event.checklist.filter((item) => item.done).length;
              return (
                <article className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm" key={event.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="font-bold text-pegasus-navy">{event.name}</h4>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                        <CalendarDays size={14} className="shrink-0" />
                        {formatDate(event.date)}
                      </p>
                      {event.location ? (
                        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                          <MapPin size={14} className="shrink-0" />
                          {event.location}
                        </p>
                      ) : null}
                    </div>
                    <StatusBadge label={statusLabel(event.status)} tone={statusTone(event.status)} />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500">
                    {event.budget !== null ? (
                      <span className="flex items-center gap-1.5">
                        <Wallet size={13} />
                        {formatCurrency(event.budget)}
                      </span>
                    ) : null}
                    {event.checklist.length > 0 ? (
                      <span className="flex items-center gap-1.5">
                        <CheckSquare size={13} />
                        {doneCount}/{event.checklist.length}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 border-t border-stone-100 pt-3">
                    <ActionButtons
                      canDelete={canDelete}
                      canEdit={canUpdate}
                      onDelete={() => setDeleteTarget(event)}
                      onEdit={() => openEditModal(event)}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="p-6">
            <EmptyState
              action={
                canCreate ? (
                  <Button onClick={openCreateModal}>
                    <Plus size={17} />
                    Novo evento
                  </Button>
                ) : undefined
              }
              description="Cadastre o primeiro evento do time — torneio, confraternização, sessão de fotos..."
              icon={CalendarDays}
              title="Nenhum evento cadastrado"
            />
          </div>
        )}
      </section>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingEvent ? "Editar evento" : "Novo evento"}>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <Input
            disabled={isSaving}
            error={formErrors.name}
            label="Nome do evento"
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex: Torneio de encerramento"
            required
            value={form.name}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              disabled={isSaving}
              error={formErrors.date}
              label="Data"
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
              type="date"
              value={form.date}
            />
            <Select
              disabled={isSaving}
              label="Status"
              onChange={(e) => setForm({ ...form, status: e.target.value as EventStatus })}
              options={statusOptions}
              value={form.status}
            />
          </div>
          <Input
            disabled={isSaving}
            label="Local (opcional)"
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="Endereço ou nome do espaço"
            value={form.location}
          />
          <Input
            disabled={isSaving}
            label="Orçamento (opcional)"
            onChange={(e) => setForm({ ...form, budget: e.target.value })}
            placeholder="0,00"
            type="number"
            value={form.budget}
          />
          <Textarea
            disabled={isSaving}
            label="Fornecedores (opcional)"
            onChange={(e) => setForm({ ...form, vendors: e.target.value })}
            placeholder="Buffet, fotógrafo, som, decoração..."
            value={form.vendors}
          />

          <section className="rounded-2xl border border-stone-200 p-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="text-pegasus-primary" size={18} />
              <h3 className="font-black text-pegasus-navy">Checklist</h3>
            </div>
            <div className="mt-3 space-y-2">
              {form.checklist.map((item) => (
                <label className="flex items-center gap-3 text-sm text-slate-600" key={item.id}>
                  <input
                    checked={item.done}
                    className="h-5 w-5 rounded border-stone-300 text-pegasus-primary"
                    onChange={() => toggleChecklistItem(item.id)}
                    type="checkbox"
                  />
                  <span className={item.done ? "text-slate-400 line-through" : ""}>{item.text}</span>
                  <button
                    className="ml-auto text-xs font-bold text-rose-600"
                    onClick={() => removeChecklistItem(item.id)}
                    type="button"
                  >
                    Remover
                  </button>
                </label>
              ))}
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Input label="Novo item" onChange={(e) => setChecklistInput(e.target.value)} value={checklistInput} />
              <Button className="sm:mt-7" onClick={addChecklistItem} type="button" variant="secondary">
                Adicionar
              </Button>
            </div>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button disabled={isSaving} type="submit">
              {isSaving ? <Loader2 className="animate-spin" size={17} /> : null}
              {editingEvent ? "Salvar alterações" : "Criar evento"}
            </Button>
            <Button disabled={isSaving} onClick={() => setIsModalOpen(false)} type="button" variant="secondary">
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        confirmLabel={isSaving ? "Excluindo..." : "Excluir evento"}
        description={`Deseja excluir "${deleteTarget?.name ?? "este evento"}"?`}
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Confirmar exclusão"
      />
    </div>
  );
}
