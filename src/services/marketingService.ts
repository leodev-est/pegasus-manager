import { api } from "./api";

export type MarketingStatus = "ideas" | "production" | "review" | "published";
export type MarketingPriority = "baixa" | "media" | "alta";
export type MarketingChannel = "Instagram" | "WhatsApp" | "Arte" | "Captacao" | "Evento";
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
  assignedTo: string | null;
  dueDate: string | null;
  priority: MarketingPriority;
  channel: MarketingChannel | null;
  labels: string[];
  comments: MarketingComment[];
  checklist: MarketingChecklistItem[];
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
  assignedTo?: string;
  dueDate?: string;
  priority?: MarketingPriority;
  channel?: MarketingChannel;
  labels?: string[];
  comments?: MarketingComment[];
  checklist?: MarketingChecklistItem[];
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
  async updateTaskStatus(id: string, status: MarketingStatus) {
    const { data } = await api.patch<MarketingTask>(`/tasks/${id}/status`, { status });
    return data;
  },
  async deleteTask(id: string) {
    await api.delete(`/tasks/${id}`);
  },
};
