import { api } from "./api";

export type Exercise = {
  name: string;
  sets: string;
  reps: string;
  notes?: string;
};

export type TrainingPlan = {
  id: string;
  athleteId: string;
  title: string;
  description: string | null;
  goals: string | null;
  exercises: Exercise[];
  startDate: string | null;
  endDate: string | null;
  active: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  athlete?: { id: string; name: string };
};

export const trainingPlanService = {
  async list(athleteId?: string) {
    const { data } = await api.get<TrainingPlan[]>("/training-plans", { params: athleteId ? { athleteId } : undefined });
    return data;
  },
  async getMine() {
    const { data } = await api.get<TrainingPlan | null>("/training-plans/me");
    return data;
  },
  async create(payload: {
    athleteId: string;
    title: string;
    description?: string;
    goals?: string;
    exercises?: Exercise[];
    startDate?: string;
    endDate?: string;
  }) {
    const { data } = await api.post<TrainingPlan>("/training-plans", payload);
    return data;
  },
  async update(id: string, payload: Partial<{
    title: string;
    description: string | null;
    goals: string | null;
    exercises: Exercise[];
    startDate: string | null;
    endDate: string | null;
    active: boolean;
  }>) {
    const { data } = await api.patch<TrainingPlan>(`/training-plans/${id}`, payload);
    return data;
  },
  async remove(id: string) {
    await api.delete(`/training-plans/${id}`);
  },
};
