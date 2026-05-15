import type { Athlete } from "./athleteService";
import { api } from "./api";
import type { AthleteEvaluation } from "./evaluationService";
import type { Payment } from "./financeService";
import type { Training } from "./trainingService";
import type { UniformDelivery } from "./uniformsService";

export type MonthlyAttendance = {
  id: string;
  status: string;
  training: { id: string; date: string; title: string };
};

export type MyProfile = {
  user: {
    id: string;
    name: string;
    username: string;
    email: string | null;
    active: boolean;
    avatarUrl: string | null;
    roles: string[];
    permissions: string[];
  };
  athlete: (Athlete & { uniformDeliveries?: UniformDelivery[]; birthDate?: string | null }) | null;
  payments: Payment[];
  totalFrequency: {
    totalTrainings: number;
    presences: number;
    absences: number;
    justified: number;
    percentage: number;
  } | null;
  monthlyAttendance: MonthlyAttendance[];
  upcomingTrainings: Training[];
  evaluation: AthleteEvaluation;
};

export const profileService = {
  async getMyProfile() {
    const { data } = await api.get<MyProfile>("/me/profile");
    return data;
  },

  async updateMyProfile(payload: { email?: string | null; phone?: string | null; birthDate?: string | null }) {
    const { data } = await api.patch<MyProfile>("/me/profile", payload);
    return data;
  },

  async uploadAvatar(file: File) {
    const form = new FormData();
    form.append("avatar", file);
    const { data } = await api.post<{ avatarUrl: string }>("/me/avatar", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
};
