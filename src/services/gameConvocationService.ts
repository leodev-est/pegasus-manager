import { api } from "./api";

export type ConvocationStatus = "convocado" | "presente" | "ausente";

export type ConvocationAthlete = {
  id: string;
  name: string;
  category: string | null;
  position: string | null;
  gender: string | null;
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

export type MyConvocation = {
  id: string;
  gameId: string;
  athleteId: string;
  status: ConvocationStatus;
  game: {
    id: string;
    date: string;
    opponent: string;
    location: string;
    result: string;
  };
};

export const gameConvocationService = {
  async getByGame(gameId: string, gender?: string): Promise<GameConvocationData> {
    const { data } = await api.get(`/games/${gameId}/convocations`, {
      params: gender && gender !== "misto" ? { gender } : undefined,
    });
    return data;
  },

  async getMyConvocations(): Promise<MyConvocation[]> {
    const { data } = await api.get("/games/convocations/mine");
    return data;
  },

  async bulkSetAndNotify(gameId: string, athleteIds: string[]) {
    const { data } = await api.put(`/games/${gameId}/convocations`, { athleteIds });
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
