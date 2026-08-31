import { api } from "./api";

export type Turma = {
  id: string;
  name: string;
  gender: "masculino" | "feminino" | null;
  daysOfWeek: string[];
  time: string;
  location: string;
  dependency: string | null;
  color: string;
  active: boolean;
  order: number;
  startDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PublicTurma = Pick<Turma, "id" | "name" | "time" | "location" | "dependency" | "daysOfWeek">;

export type TurmaPayload = {
  name?: string;
  gender?: "masculino" | "feminino" | null;
  daysOfWeek?: string[];
  time?: string;
  location?: string;
  dependency?: string | null;
  color?: string;
  active?: boolean;
  order?: number;
  startDate?: string | null;
};

export const turmaService = {
  async getAll() {
    const { data } = await api.get<Turma[]>("/turmas");
    return data;
  },

  /** Sem autenticação — usado pelo formulário público de inscrição. */
  async getPublicActive() {
    const { data } = await api.get<PublicTurma[]>("/turmas/public", {
      headers: { Authorization: undefined },
    });
    return data;
  },

  async create(payload: TurmaPayload) {
    const { data } = await api.post<Turma>("/turmas", payload);
    return data;
  },

  async update(id: string, payload: TurmaPayload) {
    const { data } = await api.patch<Turma>(`/turmas/${id}`, payload);
    return data;
  },

  async delete(id: string) {
    await api.delete(`/turmas/${id}`);
  },
};
