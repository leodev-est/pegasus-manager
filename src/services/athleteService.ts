import { api } from "./api";

export type AthleteStatus = "ativo" | "teste" | "inativo";
export type MonthlyPaymentStatus = "pago" | "pendente" | "atrasado" | "isento";

export type Athlete = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  category: string | null;
  position: string | null;
  status: AthleteStatus;
  monthlyPaymentStatus: MonthlyPaymentStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    username: string;
  } | null;
};

export type AthleteFilters = {
  search?: string;
  status?: AthleteStatus | "todos";
  category?: string;
  monthlyPaymentStatus?: MonthlyPaymentStatus | "todos";
};

export type AthletePayload = {
  name: string;
  email?: string;
  phone?: string;
  category?: string;
  position?: string;
  status?: AthleteStatus;
  monthlyPaymentStatus?: MonthlyPaymentStatus;
  notes?: string;
};

export type AthleteImportSummary = {
  totalRead: number;
  imported: number;
  duplicates: number;
  errors: Array<{
    row: number;
    message: string;
  }>;
};

function cleanFilters(filters?: AthleteFilters) {
  return {
    search: filters?.search || undefined,
    status: filters?.status && filters.status !== "todos" ? filters.status : undefined,
    category: filters?.category && filters.category !== "todos" ? filters.category : undefined,
    monthlyPaymentStatus:
      filters?.monthlyPaymentStatus && filters.monthlyPaymentStatus !== "todos"
        ? filters.monthlyPaymentStatus
        : undefined,
  };
}

export const athleteService = {
  async getAll(filters?: AthleteFilters) {
    const { data } = await api.get<Athlete[]>("/athletes", {
      params: cleanFilters(filters),
    });
    return data;
  },
  async getById(id: string) {
    const { data } = await api.get<Athlete>(`/athletes/${id}`);
    return data;
  },
  async create(payload: AthletePayload) {
    const { data } = await api.post<Athlete>("/athletes", payload);
    return data;
  },
  async update(id: string, payload: Partial<AthletePayload>) {
    const { data } = await api.patch<Athlete>(`/athletes/${id}`, payload);
    return data;
  },
  async remove(id: string) {
    const { data } = await api.delete<Athlete>(`/athletes/${id}`);
    return data;
  },
  async importFromGoogleSheets() {
    const { data } = await api.post<AthleteImportSummary>("/athletes/import/google-sheets");
    return data;
  },
};
