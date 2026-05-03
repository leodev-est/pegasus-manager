import { api } from "./api";

export type NotificationType = "treino" | "financeiro" | "frequencia" | "avaliacao" | "sistema";

export type Notification = {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
};

export const notificationService = {
  async getNotifications() {
    const { data } = await api.get<Notification[]>("/notifications");
    return data;
  },

  async markAsRead(id: string) {
    const { data } = await api.patch<Notification>(`/notifications/${id}/read`);
    return data;
  },

  async markAllAsRead() {
    const { data } = await api.patch<Notification[]>("/notifications/read-all");
    return data;
  },
};
