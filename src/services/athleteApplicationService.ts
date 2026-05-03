import { api } from "./api";
import type { Athlete } from "./athleteService";

export type AthleteApplicationStatus = "pendente" | "em_analise" | "aprovado" | "recusado";

export type AthleteApplication = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  category: string | null;
  position: string | null;
  contribution: string | null;
  source: string;
  status: AthleteApplicationStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AthleteApplicationFilters = {
  search?: string;
  status?: AthleteApplicationStatus | "todos";
  position?: string;
};

export type AthleteApplicationPayload = {
  name: string;
  email?: string;
  phone?: string;
  category?: string;
  position?: string;
  contribution?: string;
  source?: string;
  status?: AthleteApplicationStatus;
  notes?: string;
};

export type AthleteApplicationImportSummary = {
  totalRead: number;
  imported: number;
  updated?: number;
  duplicates: number;
  errors: Array<{
    row: number;
    message: string;
  }>;
};

function cleanFilters(filters?: AthleteApplicationFilters) {
  return {
    search: filters?.search || undefined,
    status: filters?.status && filters.status !== "todos" ? filters.status : undefined,
    position: filters?.position && filters.position !== "todos" ? filters.position : undefined,
  };
}

export const athleteApplicationService = {
  async getAll(filters?: AthleteApplicationFilters) {
    const { data } = await api.get<AthleteApplication[]>("/athlete-applications", {
      params: cleanFilters(filters),
    });
    return data;
  },
  async getById(id: string) {
    const { data } = await api.get<AthleteApplication>(`/athlete-applications/${id}`);
    return data;
  },
  async create(payload: AthleteApplicationPayload) {
    const { data } = await api.post<AthleteApplication>("/athlete-applications", payload);
    return data;
  },
  async update(id: string, payload: Partial<AthleteApplicationPayload>) {
    const { data } = await api.patch<AthleteApplication>(
      `/athlete-applications/${id}`,
      payload,
    );
    return data;
  },
  async approve(id: string) {
    const { data } = await api.post<{
      application: AthleteApplication;
      athlete: Athlete;
    }>(`/athlete-applications/${id}/approve`);
    return data;
  },
  async delete(id: string) {
    await api.delete(`/athlete-applications/${id}`);
  },
  async importFromGoogleSheets() {
    const { data } = await api.post<AthleteApplicationImportSummary>(
      "/athlete-applications/import/google-sheets",
    );
    return data;
  },
};
