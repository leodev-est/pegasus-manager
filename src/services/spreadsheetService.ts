import { api } from "./api";

export type Spreadsheet = {
  id: string;
  name: string;
  url: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SpreadsheetPayload = {
  name: string;
  url: string;
  description?: string;
};

export const spreadsheetService = {
  async getAll() {
    const { data } = await api.get<Spreadsheet[]>("/spreadsheets");
    return data;
  },
  async create(payload: SpreadsheetPayload) {
    const { data } = await api.post<Spreadsheet>("/spreadsheets", payload);
    return data;
  },
  async update(id: string, payload: Partial<SpreadsheetPayload>) {
    const { data } = await api.patch<Spreadsheet>(`/spreadsheets/${id}`, payload);
    return data;
  },
  async delete(id: string) {
    await api.delete(`/spreadsheets/${id}`);
  },
};
