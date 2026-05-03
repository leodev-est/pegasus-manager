import { api } from "./api";

export type SchoolStatus =
  | "nao_contatada"
  | "em_conversa"
  | "reuniao_marcada"
  | "recusada"
  | "parceria_fechada";

export type School = {
  id: string;
  name: string;
  contact: string | null;
  phone: string | null;
  email: string | null;
  region: string | null;
  status: SchoolStatus;
  responsible: string | null;
  nextAction: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SchoolContact = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  sent: boolean;
  response: string | null;
  responsible: string | null;
};

export type SchoolFilters = {
  search?: string;
  region?: string;
  status?: SchoolStatus | "todos";
  responsible?: string;
};

export type SchoolPayload = {
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  region?: string;
  status?: SchoolStatus;
  responsible?: string;
  nextAction?: string;
  notes?: string;
};

function cleanFilters(filters?: SchoolFilters) {
  return {
    search: filters?.search || undefined,
    region: filters?.region && filters.region !== "todos" ? filters.region : undefined,
    status: filters?.status && filters.status !== "todos" ? filters.status : undefined,
    responsible:
      filters?.responsible && filters.responsible !== "todos" ? filters.responsible : undefined,
  };
}

export const operationalService = {
  async getSchoolContacts() {
    const { data } = await api.get<SchoolContact[]>("/schools/contacts/google-sheets");
    return data;
  },
  async getSchools(filters?: SchoolFilters) {
    const { data } = await api.get<School[]>("/schools", {
      params: cleanFilters(filters),
    });
    return data;
  },
  async getSchoolById(id: string) {
    const { data } = await api.get<School>(`/schools/${id}`);
    return data;
  },
  async createSchool(payload: SchoolPayload) {
    const { data } = await api.post<School>("/schools", payload);
    return data;
  },
  async updateSchool(id: string, payload: Partial<SchoolPayload>) {
    const { data } = await api.patch<School>(`/schools/${id}`, payload);
    return data;
  },
  async deleteSchool(id: string) {
    await api.delete(`/schools/${id}`);
  },
};
