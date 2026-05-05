import type { AuthUser } from "../auth/AuthContext";
import { api } from "./api";

export type UserPayload = Partial<AuthUser> & {
  password?: string;
};

export const userService = {
  async getUsers() {
    const { data } = await api.get<AuthUser[]>("/users");
    return data;
  },
  async createUser(payload: UserPayload) {
    const { data } = await api.post<AuthUser>("/users", payload);
    return data;
  },
  async updateUser(id: string, payload: UserPayload) {
    const { data } = await api.patch<AuthUser>(`/users/${id}`, payload);
    return data;
  },
  async updateUserRoles(id: string, roles: string[]) {
    const { data } = await api.patch<AuthUser>(`/users/${id}/roles`, { roles });
    return data;
  },
  async deleteUser(id: string) {
    await api.delete(`/users/${id}`);
  },

  async getUsersByRole(role: string) {
    const { data } = await api.get<Array<{ id: string; name: string }>>(`/users/by-role/${role}`);
    return data;
  },
};
