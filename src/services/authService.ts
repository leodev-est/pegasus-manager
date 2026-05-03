import type { AuthUser } from "../auth/AuthContext";
import { api } from "./api";

type LoginResponse = {
  token: string;
  accessToken?: string;
  user?: AuthUser;
};

export const authService = {
  async login(email: string, password: string) {
    const { data } = await api.post<LoginResponse>("/auth/login", { login: email, password });
    return data;
  },
  async me() {
    const { data } = await api.get<AuthUser>("/auth/me");
    return data;
  },
  async changePassword(currentPassword: string, newPassword: string) {
    const { data } = await api.post<AuthUser>("/auth/change-password", {
      currentPassword,
      newPassword,
    });
    return data;
  },
  async changeFirstPassword(newPassword: string, confirmPassword: string) {
    const { data } = await api.post<AuthUser>("/auth/change-first-password", {
      newPassword,
      confirmPassword,
    });
    return data;
  },
};
