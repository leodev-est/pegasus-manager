import { api } from "./api";

export type RoleRecord = {
  id: string;
  name: string;
  description: string | null;
  permissions: Array<{
    key: string;
    name: string;
    description: string | null;
  }>;
};

export const roleService = {
  async getRoles() {
    const { data } = await api.get<RoleRecord[]>("/roles");
    return data;
  },
};
