import { api } from "./api";
import type { AthleteGender } from "./athleteService";

export type JerseyAssignment = {
  id: string;
  number: number;
  gender: AthleteGender;
  athleteId: string;
  athlete: {
    id: string;
    name: string;
    gender: AthleteGender | null;
    status: string;
  };
};

export const jerseyService = {
  async getAll(gender: AthleteGender): Promise<JerseyAssignment[]> {
    const { data } = await api.get<JerseyAssignment[]>("/jersey", { params: { gender } });
    return data;
  },

  async assign(gender: AthleteGender, number: number, athleteId: string): Promise<JerseyAssignment> {
    const { data } = await api.put<JerseyAssignment>(`/jersey/${gender}/${number}`, { athleteId });
    return data;
  },

  async unassign(gender: AthleteGender, number: number): Promise<void> {
    await api.delete(`/jersey/${gender}/${number}`);
  },
};
