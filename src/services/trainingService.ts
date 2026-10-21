import { api } from "./api";

export type Training = {
  id: string;
  date: string;
  title: string;
  category: string | null;
  warmup: string | null;
  fundamentals: string | null;
  mainPart: string | null;
  finalPart: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type TrainingFilters = {
  category?: string;
  month?: string;
  search?: string;
};

export type TrainingPayload = {
  date: string;
  title: string;
  category?: string;
  warmup?: string;
  fundamentals?: string;
  mainPart?: string;
  finalPart?: string;
  notes?: string;
  createdBy: string;
};

function cleanFilters(filters?: TrainingFilters) {
  return {
    category: filters?.category && filters.category !== "todos" ? filters.category : undefined,
    month: filters?.month || undefined,
    search: filters?.search || undefined,
  };
}

export const trainingService = {
  async getAll(filters?: TrainingFilters) {
    const { data } = await api.get<Training[]>("/trainings", {
      params: cleanFilters(filters),
    });
    return data;
  },
  async getById(id: string) {
    const { data } = await api.get<Training>(`/trainings/${id}`);
    return data;
  },
  async create(payload: TrainingPayload) {
    const { data } = await api.post<Training>("/trainings", payload);
    return data;
  },
  async update(id: string, payload: Partial<TrainingPayload>) {
    const { data } = await api.patch<Training>(`/trainings/${id}`, payload);
    return data;
  },
  async remove(id: string) {
    await api.delete(`/trainings/${id}`);
  },
  async downloadPdf(id: string, fileName: string): Promise<void> {
    const response = await api.get(`/trainings/${id}/pdf`, { responseType: "blob" });
    const url = URL.createObjectURL(response.data as Blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  },
};
