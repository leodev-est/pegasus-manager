import { api } from "./api";

export type FormationSlot = "levantador" | "oposto" | "ponteiro1" | "ponteiro2" | "central" | "libero";

export type FormationPositions = Record<FormationSlot, string | null>;

export type Formation = {
  id: string;
  name: string;
  createdBy: string;
  positions: FormationPositions;
  createdAt: string;
  updatedAt: string;
};

export type FormationPayload = {
  name: string;
  createdBy: string;
  positions: FormationPositions;
};

export const formationService = {
  async getAll() {
    const { data } = await api.get<Formation[]>("/formations");
    return data;
  },
  async create(payload: FormationPayload) {
    const { data } = await api.post<Formation>("/formations", payload);
    return data;
  },
  async update(id: string, payload: Partial<FormationPayload>) {
    const { data } = await api.patch<Formation>(`/formations/${id}`, payload);
    return data;
  },
  async remove(id: string) {
    await api.delete(`/formations/${id}`);
  },
};
