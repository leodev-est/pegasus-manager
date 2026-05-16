import { api } from "./api";

export type ConvocationStatus = "convocado" | "presente" | "ausente";

export type ConvocationAthlete = {
  id: string;
  name: string;
  category: string | null;
  position: string | null;
  convocation: {
    id: string;
    status: ConvocationStatus;
    notes: string | null;
  } | null;
};

export type GameConvocationData = {
  game: {
    id: string;
    date: string;
    opponent: string;
    location: string;
    result: string;
    scorePegasus: number;
    scoreOpponent: number;
  };
  athletes: ConvocationAthlete[];
};

export const gameConvocationService = {
  async getByGame(gameId: string): Promise<GameConvocationData> {
    const { data } = await api.get(`/games/${gameId}/convocations`);
    return data;
  },

  async upsert(gameId: string, athleteId: string, status: ConvocationStatus, notes?: string) {
    const { data } = await api.put(`/games/${gameId}/convocations/${athleteId}`, { status, notes });
    return data;
  },

  async remove(gameId: string, athleteId: string) {
    await api.delete(`/games/${gameId}/convocations/${athleteId}`);
  },
};
