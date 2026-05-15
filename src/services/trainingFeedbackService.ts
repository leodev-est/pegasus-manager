import { api } from "./api";

export type TrainingFeedback = {
  id: string;
  trainingId: string;
  athleteId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
};

export const trainingFeedbackService = {
  async submit(trainingId: string, rating: number, comment?: string) {
    const { data } = await api.post<TrainingFeedback>("/training-feedback", {
      trainingId,
      rating,
      comment,
    });
    return data;
  },

  async getMyFeedback(trainingId: string) {
    const { data } = await api.get<TrainingFeedback | null>(`/training-feedback/${trainingId}/mine`);
    return data;
  },

  async getByTraining(trainingId: string) {
    const { data } = await api.get<(TrainingFeedback & { athlete: { id: string; name: string } })[]>(
      `/training-feedback/${trainingId}`,
    );
    return data;
  },
};
