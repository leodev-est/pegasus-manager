import { api } from "./api";

export type Injury = {
  id: string;
  athleteId: string;
  type: string;
  severity: string;
  description: string | null;
  startDate: string;
  expectedReturn: string | null;
  returnedAt: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  athlete?: { id: string; name: string };
};

export const injuryService = {
  async list(athleteId?: string) {
    const { data } = await api.get<Injury[]>("/injuries", { params: athleteId ? { athleteId } : undefined });
    return data;
  },
  async listMine() {
    const { data } = await api.get<Injury[]>("/injuries/me");
    return data;
  },
  async create(payload: {
    athleteId: string;
    type: string;
    severity: string;
    description?: string;
    startDate: string;
    expectedReturn?: string;
    notes?: string;
  }) {
    const { data } = await api.post<Injury>("/injuries", payload);
    return data;
  },
  async update(id: string, payload: Partial<{
    type: string;
    severity: string;
    description: string | null;
    expectedReturn: string | null;
    returnedAt: string | null;
    notes: string | null;
  }>) {
    const { data } = await api.patch<Injury>(`/injuries/${id}`, payload);
    return data;
  },
  async remove(id: string) {
    await api.delete(`/injuries/${id}`);
  },
};
