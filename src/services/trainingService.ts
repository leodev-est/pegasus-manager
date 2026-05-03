import { api } from "./api";

export type Training = {
  id: string;
  date: string;
  title: string;
  category: string | null;
  objective: string | null;
  warmup: string | null;
  fundamentals: string | null;
  mainPart: string | null;
  reducedGame: string | null;
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
  objective?: string;
  warmup?: string;
  fundamentals?: string;
  mainPart?: string;
  reducedGame?: string;
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
};
