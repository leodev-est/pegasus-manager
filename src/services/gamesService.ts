import { api } from "./api";

export type GameResult = "vitoria" | "derrota" | "empate" | "pendente";
export type GameLocation = "casa" | "fora";

export type GameSet = {
  id: string;
  gameId: string;
  setNumber: number;
  scorePegasus: number;
  scoreOpponent: number;
};

export type Game = {
  id: string;
  date: string;
  opponent: string;
  location: GameLocation;
  scorePegasus: number;
  scoreOpponent: number;
  result: GameResult;
  notes: string | null;
  sets: GameSet[];
  createdAt: string;
  updatedAt: string;
};

export type GameStats = {
  total: number;
  vitorias: number;
  derrotas: number;
  empates: number;
  totalPoints: number;
  totalConceded: number;
};

export type GamePayload = {
  date: string;
  opponent: string;
  location?: GameLocation;
  scorePegasus?: number;
  scoreOpponent?: number;
  notes?: string | null;
};

export const gamesService = {
  async getAll(month?: string) {
    const { data } = await api.get<Game[]>("/games", { params: { month } });
    return data;
  },
  async getStats(month?: string) {
    const { data } = await api.get<GameStats>("/games/stats", { params: { month } });
    return data;
  },
  async getById(id: string) {
    const { data } = await api.get<Game>(`/games/${id}`);
    return data;
  },
  async create(payload: GamePayload) {
    const { data } = await api.post<Game>("/games", payload);
    return data;
  },
  async update(id: string, payload: Partial<GamePayload>) {
    const { data } = await api.patch<Game>(`/games/${id}`, payload);
    return data;
  },
  async delete(id: string) {
    await api.delete(`/games/${id}`);
  },
  async upsertSet(gameId: string, payload: { setNumber: number; scorePegasus: number; scoreOpponent: number }) {
    const { data } = await api.put<GameSet>(`/games/${gameId}/sets`, payload);
    return data;
  },
  async deleteSet(gameId: string, setNumber: number) {
    await api.delete(`/games/${gameId}/sets/${setNumber}`);
  },
};
