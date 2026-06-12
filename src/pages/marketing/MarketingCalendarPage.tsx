import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { Textarea } from "../../components/ui/Textarea";
import { useToast } from "../../components/ui/Toast";
import { getApiErrorMessage } from "../../services/api";
import {
  marketingCalendarService,
  getEventColor,
  type CalendarEvent,
} from "../../services/marketingCalendarService";

const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getBrazilToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function buildCalendarDays(year: number, month: number): Array<Date | null> {
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const lastDay = new Date(Date.UTC(year, month, 0));
  const days: Array<Date | null> = [];
  for (let i = 0; i < firstDay.getUTCDay(); i++) days.push(null);
  for (let d = 1; d <= lastDay.getUTCDate(); d++) {
    days.push(new Date(Date.UTC(year, month - 1, d)));
  }
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function eventLabel(ev: CalendarEvent) {
  return ev.description || ev.title;
}

export function MarketingCalendarPage() {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const canEdit = hasPermission(["marketing:create", "marketing:update", "marketing:delete"]);

  const today = getBrazilToday();
  const todayDate = new Date(today + "T12:00:00Z");
  const [year, setYear] = useState(todayDate.getUTCFullYear());
  const [month, setMonth] = useState(todayDate.getUTCMonth() + 1);

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [createDate, setCreateDate] = useState<string | null>(null);
  const [createText, setCreateText] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState("");

  const queryKey = ["marketing-calendar", year, month];

  const { data: events = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => marketingCalendarService.getEvents(month, year),
  });

  const createMutation = useMutation({
    mutationFn: (text: string) =>
      marketingCalendarService.createEvent({
        title: text.slice(0, 80),
        description: text,
        date: createDate!,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setCreateDate(null);
      setCreateText("");
      showToast("Evento adicionado.", "success");
    },
    onError: (err) => showToast(getApiErrorMessage(err), "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      marketingCalendarService.updateEvent(id, {
        title: text.slice(0, 80),
        description: text,
      }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey });
      setSelectedEvent(updated as CalendarEvent & { isReadOnly: boolean; athleteName: string | null });
      setEditMode(false);
      showToast("Evento atualizado.", "success");
    },
    onError: (err) => showToast(getApiErrorMessage(err), "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => marketingCalendarService.deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setSelectedEvent(null);
      showToast("Evento removido.", "success");
    },
    onError: (err) => showToast(getApiErrorMessage(err), "error"),
  });

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }
  function goToday() {
    setYear(todayDate.getUTCFullYear());
    setMonth(todayDate.getUTCMonth() + 1);
  }

  const days = useMemo(() => buildCalendarDays(year, month), [year, month]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const ev of events) {
      if (!map[ev.date]) map[ev.date] = [];
      map[ev.date].push(ev);
    }
    return map;
  }, [events]);

  function openCreate(dateKey: string) {
    if (!canEdit) return;
    setCreateDate(dateKey);
    setCreateText("");
  }

  function openEvent(ev: CalendarEvent) {
    setSelectedEvent(ev);
    setEditMode(false);
  }

  function startEdit() {
    if (!selectedEvent) return;
    setEditText(selectedEvent.description ?? selectedEvent.title);
    setEditMode(true);
  }

  function formatDateLabel(dateKey: string) {
    const [y, m, d] = dateKey.split("-").map(Number);
    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(y, m - 1, d)));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendário de Marketing"
        description="Acompanhe atividades e aniversários dos atletas."
        action={
          canEdit ? (
            <Button onClick={() => openCreate(today)}>
              <Plus size={17} />
              Novo evento
            </Button>
          ) : undefined
        }
      />

      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-blue-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToday}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={prevMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <h2 className="text-base font-bold text-pegasus-navy">
            {MONTHS_PT[month - 1]} {year}
          </h2>
          <div className="text-xs text-slate-500">
            {isLoading && <span className="animate-pulse">Carregando...</span>}
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-blue-100 bg-pegasus-surface text-center text-xs font-semibold uppercase tracking-widest text-slate-500">
          {WEEK_DAYS.map((d) => (
            <div key={d} className="py-2.5">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 bg-white">
          {days.map((day, index) => {
            if (!day) {
              return (
                <div
                  key={`empty-${index}`}
                  className="min-h-28 border-b border-r border-blue-50 bg-slate-50/40"
                />
              );
            }

            const dateKey = toDateKey(day);
            const isToday = dateKey === today;
            const dayEvents = eventsByDate[dateKey] ?? [];
            const visible = dayEvents.slice(0, 3);
            const overflow = dayEvents.length - 3;

            return (
              <div
                key={dateKey}
                className={`group min-h-28 border-b border-r border-blue-50 p-1.5 transition-colors ${
                  canEdit ? "cursor-pointer hover:bg-blue-50/40" : ""
                } ${isToday ? "bg-blue-50/60" : "bg-white"}`}
                onClick={() => openCreate(dateKey)}
              >
                <div className="mb-1 flex items-center justify-between px-0.5">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      isToday ? "bg-pegasus-primary text-white" : "text-slate-700"
                    }`}
                  >
                    {day.getUTCDate()}
                  </span>
                  {canEdit && (
                    <Plus
                      size={12}
                      className="hidden text-pegasus-primary opacity-0 group-hover:opacity-60 md:block"
                    />
                  )}
                </div>

                <div className="space-y-0.5">
                  {visible.map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openEvent(ev); }}
                      className={`w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-semibold text-white transition hover:brightness-90 ${getEventColor(ev.type)}`}
                    >
                      {eventLabel(ev)}
                    </button>
                  ))}
                  {overflow > 0 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openEvent(dayEvents[3]); }}
                      className="w-full rounded px-1.5 py-0.5 text-left text-[11px] font-semibold text-slate-500 hover:bg-slate-100"
                    >
                      +{overflow} mais
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: criar evento */}
      <Modal
        isOpen={Boolean(createDate)}
        onClose={() => setCreateDate(null)}
        title="Novo evento"
        description={createDate ? formatDateLabel(createDate) : ""}
      >
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate(createText);
          }}
        >
          <Textarea
            label="Descrição"
            required
            placeholder="Descreva o evento..."
            value={createText}
            onChange={(e) => setCreateText(e.target.value)}
            rows={4}
          />
          <div className="flex gap-3">
            <Button type="submit" disabled={createMutation.isPending || !createText.trim()}>
              {createMutation.isPending ? "Salvando..." : "Adicionar"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setCreateDate(null)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: ver / editar evento */}
      <Modal
        isOpen={Boolean(selectedEvent)}
        onClose={() => { setSelectedEvent(null); setEditMode(false); }}
        title={editMode ? "Editar evento" : "Evento"}
        description={selectedEvent ? formatDateLabel(selectedEvent.date) : ""}
      >
        {selectedEvent && !editMode && (
          <div className="space-y-4">
            <p className="text-sm text-slate-700 whitespace-pre-wrap">
              {selectedEvent.description || selectedEvent.title}
            </p>

            {selectedEvent.athleteName && (
              <p className="text-sm text-slate-500">
                Atleta: <span className="font-semibold text-pegasus-navy">{selectedEvent.athleteName}</span>
              </p>
            )}

            {canEdit && !selectedEvent.isReadOnly && (
              <div className="flex gap-2 border-t border-blue-50 pt-4">
                <Button onClick={startEdit} variant="secondary">
                  Editar
                </Button>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(selectedEvent.id)}
                  disabled={deleteMutation.isPending}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 transition disabled:opacity-50"
                >
                  <Trash2 size={15} />
                  {deleteMutation.isPending ? "Removendo..." : "Remover"}
                </button>
              </div>
            )}
          </div>
        )}

        {selectedEvent && editMode && (
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate({ id: selectedEvent.id, text: editText });
            }}
          >
            <Textarea
              label="Descrição"
              required
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={4}
            />
            <div className="flex gap-3">
              <Button type="submit" disabled={updateMutation.isPending || !editText.trim()}>
                {updateMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setEditMode(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
