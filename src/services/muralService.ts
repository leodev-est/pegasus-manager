import { api } from "./api";

export type MuralPost = {
  id: string;
  title: string;
  body: string;
  category: "info" | "urgente" | "evento";
  authorId: string;
  createdAt: string;
  updatedAt: string;
};

export const muralService = {
  async list() {
    const { data } = await api.get<MuralPost[]>("/mural");
    return data;
  },
  async create(payload: { title: string; body: string; category: string }) {
    const { data } = await api.post<MuralPost>("/mural", payload);
    return data;
  },
  async remove(id: string) {
    await api.delete(`/mural/${id}`);
  },
};
