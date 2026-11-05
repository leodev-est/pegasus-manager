import { api } from "./api";

export type MarketingStatus = "ideas" | "production" | "review" | "scheduled" | "published";
export type MarketingPriority = "baixa" | "media" | "alta";
/** Plataforma. "Arte", "Captacao" e "Evento" são valores antigos, de antes do campo Formato. */
export type MarketingChannel = "Instagram" | "YouTube" | "WhatsApp" | "Arte" | "Captacao" | "Evento";
export type MarketingFormat = "video" | "video_arte" | "arte" | "evento" | "tarefa";
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
  approvalStatus: string | null;
  scheduledAt: string | null;
  format: MarketingFormat | null;
  stagesDone: string[];
  statusChangedAt: string | null;
  archivedAt: string | null;
  position: number | null;
  createdAt: string;
  updatedAt: string;
};

export type MarketingFilters = {
  channel?: MarketingChannel | "todos";
  assignedTo?: string;
  priority?: MarketingPriority | "todos";
  /** Also return archived cards (by hand or published more than 30 days ago). */
  includeArchived?: boolean;
};

export type MarketingTaskPayload = {
  title: string;
  description?: string;
  status?: MarketingStatus;
  area?: "marketing";
  assignedTo?: string[];
  dueDate?: string | null;
  priority?: MarketingPriority;
  channel?: MarketingChannel | null;
  labels?: string[];
  comments?: MarketingComment[];
  checklist?: MarketingChecklistItem[];
  format?: MarketingFormat | null;
  stagesDone?: string[];
};

export type MarketingHistoryEntry = {
  id: string;
  action: string;
  userName: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
};

export type MarketingTeamMember = {
  id: string;
  name: string;
  marketingFunction: string | null;
};

function cleanFilters(filters?: MarketingFilters) {
  return {
    area: "marketing",
    channel: filters?.channel && filters.channel !== "todos" ? filters.channel : undefined,
    assignedTo:
      filters?.assignedTo && filters.assignedTo !== "todos" ? filters.assignedTo : undefined,
    priority: filters?.priority && filters.priority !== "todos" ? filters.priority : undefined,
    includeArchived: filters?.includeArchived ? "true" : undefined,
  };
}

export const marketingService = {
  async getTeam() {
    const { data } = await api.get<MarketingTeamMember[]>("/users/marketing-team");
    return data;
  },
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
  async updateTaskStatus(id: string, status: MarketingStatus) {
    const { data } = await api.patch<MarketingTask>(`/tasks/${id}/status`, { status });
    return data;
  },
  async reorderTask(id: string, neighbours: { beforeId: string | null; afterId: string | null }) {
    const { data } = await api.patch<MarketingTask>(`/tasks/${id}/position`, neighbours);
    return data;
  },
  async addComment(id: string, text: string) {
    const { data } = await api.post<MarketingTask>(`/tasks/${id}/comments`, { text });
    return data;
  },
  async getHistory(id: string) {
    const { data } = await api.get<MarketingHistoryEntry[]>(`/tasks/${id}/history`);
    return data;
  },
  async getTask(id: string) {
    const { data } = await api.get<MarketingTask>(`/tasks/${id}`);
    return data;
  },
  async archiveTask(id: string, archived: boolean) {
    const { data } = await api.patch<MarketingTask>(`/tasks/${id}/archive`, { archived });
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
};
