import { api } from "./api";
import type { ContentFormat } from "../utils/contentPipeline";

export type ReferenceStatus = "nova" | "aprovada" | "gravada" | "descartada";
export type ReferencePlatform = "instagram" | "youtube" | "tiktok" | "outro";

export type ReferenceVideo = {
  id: string;
  url: string;
  platform: ReferencePlatform;
  title: string;
  note: string | null;
  tags: string[];
  status: ReferenceStatus;
  addedBy: string;
  taskId: string | null;
  createdAt: string;
  updatedAt: string;
  task?: { id: string; title: string; dueDate: string | null; status: string } | null;
};

export type ReferencePayload = {
  url?: string;
  title?: string;
  note?: string;
  tags?: string[];
  platform?: ReferencePlatform;
  status?: ReferenceStatus;
};

export const referenceService = {
  async getAll(filters?: { status?: ReferenceStatus | "todos"; tag?: string; search?: string }) {
    const { data } = await api.get<ReferenceVideo[]>("/references", {
      params: {
        status: filters?.status && filters.status !== "todos" ? filters.status : undefined,
        tag: filters?.tag || undefined,
        search: filters?.search || undefined,
      },
    });
    return data;
  },

  async create(payload: ReferencePayload) {
    const { data } = await api.post<ReferenceVideo>("/references", payload);
    return data;
  },

  async update(id: string, payload: ReferencePayload) {
    const { data } = await api.patch<ReferenceVideo>(`/references/${id}`, payload);
    return data;
  },

  async toTask(id: string, payload: { date: string; format: ContentFormat }) {
    const { data } = await api.post<{ reference: ReferenceVideo; task: { id: string } }>(`/references/${id}/task`, payload);
    return data;
  },

  async delete(id: string) {
    await api.delete(`/references/${id}`);
  },
};
