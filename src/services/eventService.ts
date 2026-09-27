import { api } from "./api";

export type EventStatus = "planejamento" | "confirmado" | "realizado";

export type EventChecklistItem = {
  id: string;
  text: string;
  done: boolean;
};

export type ClubEvent = {
  id: string;
  name: string;
  date: string;
  location: string | null;
  budget: number | null;
  vendors: string | null;
  checklist: EventChecklistItem[];
  status: EventStatus;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EventPayload = {
  name: string;
  date: string;
  location?: string;
  budget?: number | null;
  vendors?: string;
  checklist?: EventChecklistItem[];
  status?: EventStatus;
};

export const eventService = {
  async getAll() {
    const { data } = await api.get<ClubEvent[]>("/events");
    return data;
  },

  async create(payload: EventPayload) {
    const { data } = await api.post<ClubEvent>("/events", payload);
    return data;
  },

  async update(id: string, payload: Partial<EventPayload>) {
    const { data } = await api.patch<ClubEvent>(`/events/${id}`, payload);
    return data;
  },

  async delete(id: string) {
    await api.delete(`/events/${id}`);
  },
};
