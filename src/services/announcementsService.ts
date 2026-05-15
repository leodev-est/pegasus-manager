import { api } from "./api";

export type AnnouncementTemplate = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type ScheduledAnnouncement = {
  id: string;
  title: string;
  body: string;
  target: "all" | "active";
  channel: "whatsapp" | "notification" | "both";
  scheduledAt: string;
  sentAt: string | null;
  status: "pending" | "sent" | "failed" | "cancelled";
  error: string | null;
  createdAt: string;
};

export const announcementsService = {
  async listTemplates() {
    const { data } = await api.get<AnnouncementTemplate[]>("/announcements/templates");
    return data;
  },
  async createTemplate(payload: { title: string; body: string }) {
    const { data } = await api.post<AnnouncementTemplate>("/announcements/templates", payload);
    return data;
  },
  async updateTemplate(id: string, payload: { title?: string; body?: string }) {
    const { data } = await api.patch<AnnouncementTemplate>(`/announcements/templates/${id}`, payload);
    return data;
  },
  async deleteTemplate(id: string) {
    await api.delete(`/announcements/templates/${id}`);
  },
  async listScheduled() {
    const { data } = await api.get<ScheduledAnnouncement[]>("/announcements/scheduled");
    return data;
  },
  async createScheduled(payload: {
    title: string;
    body: string;
    target: "all" | "active";
    channel: "whatsapp" | "notification" | "both";
    scheduledAt: string;
  }) {
    const { data } = await api.post<ScheduledAnnouncement>("/announcements/scheduled", payload);
    return data;
  },
  async cancelScheduled(id: string) {
    const { data } = await api.patch<ScheduledAnnouncement>(`/announcements/scheduled/${id}/cancel`);
    return data;
  },
};
