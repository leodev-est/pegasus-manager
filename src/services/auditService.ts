import { api } from "./api";

export type AuditLog = {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  meta: Record<string, unknown>;
  createdAt: string;
};

export const auditService = {
  async list(filters?: { entity?: string; userId?: string; limit?: number }) {
    const { data } = await api.get<AuditLog[]>("/audit", { params: filters });
    return data;
  },
};
