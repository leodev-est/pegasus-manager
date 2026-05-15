import { api } from "./api";

export type MonthlyReport = {
  id: string;
  month: string;
  fileName: string;
  fileSize: number;
  generatedAt: string;
  sentAt: string | null;
};

export const reportsService = {
  async list(): Promise<MonthlyReport[]> {
    const { data } = await api.get<MonthlyReport[]>("/reports");
    return data;
  },

  async generate(): Promise<MonthlyReport> {
    const { data } = await api.post<MonthlyReport>("/reports/generate");
    return data;
  },

  async download(id: string, fileName: string): Promise<void> {
    const response = await api.get(`/reports/${id}/download`, { responseType: "blob" });
    const url = URL.createObjectURL(response.data as Blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  },
};
