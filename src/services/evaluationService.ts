import { api } from "./api";

export type AthleteEvaluation = {
  id: string | null;
  selfRating: number | null;
  strengths: string | null;
  improvements: string | null;
  technical: number | null;
  physical: number | null;
  tactical: number | null;
  mental: number | null;
  coachNotes: string | null;
  overall: number | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type SelfEvaluationPayload = {
  selfRating?: number | null;
  strengths?: string | null;
  improvements?: string | null;
};

export type CoachEvaluationPayload = {
  technical?: number | null;
  physical?: number | null;
  tactical?: number | null;
  mental?: number | null;
  coachNotes?: string | null;
};

export const evaluationService = {
  async getMyEvaluation() {
    const { data } = await api.get<AthleteEvaluation>("/evaluations/me");
    return data;
  },

  async updateSelfEvaluation(payload: SelfEvaluationPayload) {
    const { data } = await api.patch<AthleteEvaluation>("/evaluations/self", payload);
    return data;
  },

  async getEvaluationByAthlete(athleteId: string) {
    const { data } = await api.get<AthleteEvaluation>(`/evaluations/${athleteId}`);
    return data;
  },

  async updateCoachEvaluation(athleteId: string, payload: CoachEvaluationPayload) {
    const { data } = await api.patch<AthleteEvaluation>(`/evaluations/${athleteId}`, payload);
    return data;
  },
};
