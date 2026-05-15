import { api } from "./api";

export type TrainingConfig = {
  trainingTime: string;
  trainingLocation: string;
  trainingDependency: string;
  trainingDaysOfWeek: string[];
  trainingDuration: number;
  defaultTrainingCategory: string;
  monthlyFeeAmount: number;
  overduePaymentDays: number;
  maxAbsencesPercentage: number;
  minAttendanceToEvaluate: number;
  notifyOnApproval: boolean;
  notifyOnOverdue: boolean;
  notifyOnTraining: boolean;
  systemName: string;
  timezone: string;
  blockedDates: string[];
  emailEnabled: boolean;
  emailFallbackEnabled: boolean;
  emailHost: string | null;
  emailPort: number | null;
  emailSecure: boolean;
  emailUser: string | null;
  emailPassword: string | null;
  emailFrom: string | null;
  emailFromName: string;
};

export const settingsService = {
  async getTrainingConfig() {
    const { data } = await api.get<TrainingConfig>("/calendar/training-config");
    return data;
  },
  async updateTrainingConfig(payload: Partial<TrainingConfig> & { emailPassword?: string }) {
    const { data } = await api.put<TrainingConfig>("/calendar/training-config", payload);
    return data;
  },
};
