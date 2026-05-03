import { api } from "./api";

export type TaskStatus = "todo" | "doing" | "done";
export type TaskPriority = "baixa" | "media" | "alta";

export type TaskComment = {
  id: string;
  text: string;
  author?: string;
  createdAt: string;
};

export type TaskChecklistItem = {
  id: string;
  text: string;
  done: boolean;
};

export type ManagementTask = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  area: "management";
  assignedTo: string | null;
  dueDate: string | null;
  priority: TaskPriority;
  labels: string[];
  comments: TaskComment[];
  checklist: TaskChecklistItem[];
  createdAt: string;
  updatedAt: string;
};

export type TaskFilters = {
  area?: "management";
  status?: TaskStatus | "todos";
  assignedTo?: string;
  priority?: TaskPriority | "todos";
  search?: string;
};

export type TaskPayload = {
  title: string;
  description?: string;
  status?: TaskStatus;
  area?: "management";
  assignedTo?: string;
  dueDate?: string;
  priority?: TaskPriority;
  labels?: string[];
  comments?: TaskComment[];
  checklist?: TaskChecklistItem[];
};

function cleanFilters(filters?: TaskFilters) {
  return {
    area: filters?.area ?? "management",
    status: filters?.status && filters.status !== "todos" ? filters.status : undefined,
    assignedTo:
      filters?.assignedTo && filters.assignedTo !== "todos" ? filters.assignedTo : undefined,
    priority: filters?.priority && filters.priority !== "todos" ? filters.priority : undefined,
    search: filters?.search || undefined,
  };
}

export const kanbanService = {
  async getTasks(filters?: TaskFilters) {
    const { data } = await api.get<ManagementTask[]>("/tasks", {
      params: cleanFilters(filters),
    });
    return data;
  },
  async getTaskById(id: string) {
    const { data } = await api.get<ManagementTask>(`/tasks/${id}`);
    return data;
  },
  async createTask(payload: TaskPayload) {
    const { data } = await api.post<ManagementTask>("/tasks", payload);
    return data;
  },
  async updateTask(id: string, payload: Partial<TaskPayload>) {
    const { data } = await api.patch<ManagementTask>(`/tasks/${id}`, payload);
    return data;
  },
  async updateTaskStatus(id: string, status: TaskStatus) {
    const { data } = await api.patch<ManagementTask>(`/tasks/${id}/status`, { status });
    return data;
  },
  async deleteTask(id: string) {
    await api.delete(`/tasks/${id}`);
  },
};
