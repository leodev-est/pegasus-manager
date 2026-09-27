import { api } from "./api";

export type ContentStatus = "referencia" | "definido" | "gravado" | "editado" | "postado";

export type ContentItem = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  status: ContentStatus;
  assignedTo: string[];
  createdAt: string;
  updatedAt: string;
};

export type WeekTeamEvent = {
  id: string;
  name: string;
  date: string;
  location: string | null;
};

export type ContentItemPayload = {
  title: string;
  description?: string;
  date: string;
  status?: ContentStatus;
  assignedTo?: string[];
};

export const contentItemService = {
  async getWeek(dateInWeek: string) {
    const { data } = await api.get<{ weekStart: string; items: ContentItem[]; events: WeekTeamEvent[] }>(
      "/content-items/week",
      { params: { date: dateInWeek } },
    );
    return data;
  },

  async create(payload: ContentItemPayload) {
    const { data } = await api.post<ContentItem>("/content-items", payload);
    return data;
  },

  async update(id: string, payload: Partial<ContentItemPayload>) {
    const { data } = await api.patch<ContentItem>(`/content-items/${id}`, payload);
    return data;
  },

  async delete(id: string) {
    await api.delete(`/content-items/${id}`);
  },
};
