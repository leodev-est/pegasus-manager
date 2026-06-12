import { api } from "./api";

export type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  time: string | null;
  type: string;
  athleteId: string | null;
  athleteName: string | null;
  isReadOnly: boolean;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type CalendarEventPayload = {
  title: string;
  description?: string | null;
  date: string;
  time?: string | null;
  type?: string;
};

export const EVENT_TYPES = [
  { value: "atividade", label: "Atividade", color: "bg-blue-500" },
  { value: "post", label: "Post / Conteúdo", color: "bg-emerald-500" },
  { value: "reuniao", label: "Reunião", color: "bg-violet-500" },
  { value: "lembrete", label: "Lembrete", color: "bg-amber-500" },
  { value: "aniversario", label: "Aniversário", color: "bg-rose-400" },
  { value: "agendado", label: "Agendado (Kanban)", color: "bg-sky-500" },
  { value: "publicado", label: "Publicado (Kanban)", color: "bg-teal-500" },
] as const;

export function getEventColor(type: string): string {
  return EVENT_TYPES.find((t) => t.value === type)?.color ?? "bg-slate-400";
}

export const marketingCalendarService = {
  async getEvents(month: number, year: number): Promise<CalendarEvent[]> {
    const { data } = await api.get<CalendarEvent[]>("/marketing-calendar/events", {
      params: { month, year },
    });
    return data;
  },

  async createEvent(payload: CalendarEventPayload): Promise<CalendarEvent> {
    const { data } = await api.post<CalendarEvent>("/marketing-calendar/events", payload);
    return data;
  },

  async updateEvent(id: string, payload: Partial<CalendarEventPayload>): Promise<CalendarEvent> {
    const { data } = await api.patch<CalendarEvent>(`/marketing-calendar/events/${id}`, payload);
    return data;
  },

  async deleteEvent(id: string): Promise<void> {
    await api.delete(`/marketing-calendar/events/${id}`);
  },
};
