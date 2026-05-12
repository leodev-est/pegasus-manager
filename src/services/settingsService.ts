import { api } from "./api";

export type TrainingConfig = {
  trainingTime: string;
  trainingLocation: string;
  trainingDependency: string;
  monthlyFeeAmount: number;
};

export const settingsService = {
  async getTrainingConfig() {
    const { data } = await api.get<TrainingConfig>("/calendar/training-config");
    return data;
  },
  async updateTrainingConfig(payload: Partial<TrainingConfig>) {
    const { data } = await api.put<TrainingConfig>("/calendar/training-config", payload);
    return data;
  },
};
