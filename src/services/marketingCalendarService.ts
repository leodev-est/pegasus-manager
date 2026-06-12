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

export function getEventColor(type: string): string {
  if (type === "aniversario") return "bg-rose-500";
  if (type === "agendado") return "bg-sky-600";
  if (type === "publicado") return "bg-teal-600";
  return "bg-blue-600";
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
