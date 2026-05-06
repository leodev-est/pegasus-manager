import type { Athlete } from "./athleteService";
import { api } from "./api";
import type { AthleteEvaluation } from "./evaluationService";
import type { Payment } from "./financeService";
import type { Training } from "./trainingService";

export type MyProfile = {
  user: {
    id: string;
    name: string;
    username: string;
    email: string | null;
    active: boolean;
    roles: string[];
    permissions: string[];
  };
  athlete: Athlete | null;
  payments: Payment[];
  totalFrequency: {
    totalTrainings: number;
    presences: number;
    absences: number;
    justified: number;
    percentage: number;
  } | null;
  upcomingTrainings: Training[];
  evaluation: AthleteEvaluation;
};

export const profileService = {
  async getMyProfile() {
    const { data } = await api.get<MyProfile>("/me/profile");
    return data;
  },

  async updateMyProfile(payload: { email?: string | null; phone?: string | null }) {
    const { data } = await api.patch<MyProfile>("/me/profile", payload);
    return data;
  },
};
