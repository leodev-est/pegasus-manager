import { api } from "./api";
import type { ContentFormat, ContentStatus } from "../utils/contentPipeline";

export type MarketingStatus = "ideas" | "production" | "review" | "scheduled" | "published";
export type MarketingPriority = "baixa" | "media" | "alta";
export type MarketingChannel = "Instagram" | "WhatsApp" | "Arte" | "Captacao" | "Evento" | "Video" | "YouTube";
export type MarketingComment = {
  id: string;
  text: string;
  author?: string;
  createdAt: string;
};
export type MarketingChecklistItem = {
  id: string;
  text: string;
  done: boolean;
};

export type MarketingTask = {
  id: string;
  title: string;
  description: string | null;
  status: MarketingStatus;
  area: "marketing";
  assignedTo: string[];
  dueDate: string | null;
  priority: MarketingPriority;
  channel: MarketingChannel | null;
  labels: string[];
  comments: MarketingComment[];
  checklist: MarketingChecklistItem[];
  links: Array<{ id: string; label: string; url: string }>;
  approvalStatus: string | null;
  scheduledAt: string | null;
  statusChangedAt: string;
  position: number;
  contentFormat: ContentFormat | null;
  contentStep: ContentStatus | null;
  createdAt: string;
  updatedAt: string;
};

export type MarketingFilters = {
  channel?: MarketingChannel | "todos";
  assignedTo?: string;
  priority?: MarketingPriority | "todos";
};

export type MarketingTaskPayload = {
  title: string;
  description?: string;
  status?: MarketingStatus;
  area?: "marketing";
  assignedTo?: string[];
  dueDate?: string;
  priority?: MarketingPriority;
  channel?: MarketingChannel;
  labels?: string[];
  comments?: MarketingComment[];
  checklist?: MarketingChecklistItem[];
  links?: Array<{ id: string; label: string; url: string }>;
  contentFormat?: ContentFormat | null;
  contentStep?: ContentStatus | null;
};

function cleanFilters(filters?: MarketingFilters) {
  return {
    area: "marketing",
    channel: filters?.channel && filters.channel !== "todos" ? filters.channel : undefined,
    assignedTo:
      filters?.assignedTo && filters.assignedTo !== "todos" ? filters.assignedTo : undefined,
    priority: filters?.priority && filters.priority !== "todos" ? filters.priority : undefined,
  };
}

export const marketingService = {
  async getTasks(filters?: MarketingFilters) {
    const { data } = await api.get<MarketingTask[]>("/tasks", {
      params: cleanFilters(filters),
    });
    return data;
  },
  async createTask(payload: MarketingTaskPayload) {
    const { data } = await api.post<MarketingTask>("/tasks", {
      ...payload,
      area: "marketing",
    });
    return data;
  },
  async updateTask(id: string, payload: Partial<MarketingTaskPayload>) {
    const { data } = await api.patch<MarketingTask>(`/tasks/${id}`, payload);
    return data;
  },
  async updateTaskStatus(id: string, status: MarketingStatus, position?: number) {
    const { data } = await api.patch<MarketingTask>(`/tasks/${id}/status`, { status, position });
    return data;
  },
  async deleteTask(id: string) {
    await api.delete(`/tasks/${id}`);
  },

  async approveTask(id: string, action: "schedule" | "publish", scheduledAt?: string) {
    const { data } = await api.patch<MarketingTask>(`/tasks/${id}/approve`, { action, scheduledAt });
    return data;
  },

  async rejectTask(id: string) {
    const { data } = await api.patch<MarketingTask>(`/tasks/${id}/reject`, {});
    return data;
  },

  async getCleanupPreview() {
    const { data } = await api.get<{ count: number; retentionDays: number }>("/tasks/cleanup-preview", {
      params: { area: "marketing" },
    });
    return data;
  },

  async getHistory(id: string) {
    const { data } = await api.get<Array<{ id: string; action: string; userName: string | null; meta: unknown; createdAt: string }>>(
      `/tasks/${id}/history`,
    );
    return data;
  },

  async cleanupOldTasks() {
    const { data } = await api.post<{ deleted: number }>("/tasks/cleanup", { area: "marketing" });
    return data;
  },
};
