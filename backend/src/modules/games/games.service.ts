import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";

type GamePayload = {
  date: string;
  opponent: string;
  location?: string;
  scorePegasus?: number;
  scoreOpponent?: number;
  notes?: string | null;
};

type GameSetPayload = {
  setNumber: number;
  scorePegasus: number;
  scoreOpponent: number;
};

function calcResult(scorePegasus: number, scoreOpponent: number): string {
  if (scorePegasus > scoreOpponent) return "vitoria";
  if (scoreOpponent > scorePegasus) return "derrota";
  return "empate";
}

function buildData(payload: GamePayload) {
  if (!payload.opponent?.trim()) throw new AppError("Adversário é obrigatório", 400);
  const location = payload.location ?? "casa";
  if (!["casa", "fora"].includes(location)) throw new AppError("Local deve ser 'casa' ou 'fora'", 400);

  const scorePegasus = payload.scorePegasus ?? 0;
  const scoreOpponent = payload.scoreOpponent ?? 0;
  if (scorePegasus < 0 || scoreOpponent < 0) throw new AppError("Placar não pode ser negativo", 400);

  // Se nenhum placar foi informado, o jogo ainda não aconteceu → pendente
  const hasScores = payload.scorePegasus !== undefined || payload.scoreOpponent !== undefined;

  return {
    date: new Date(payload.date),
    opponent: payload.opponent.trim(),
    location,
    scorePegasus,
    scoreOpponent,
    result: hasScores ? calcResult(scorePegasus, scoreOpponent) : "pendente",
    notes: payload.notes?.trim() || null,
  };
}

export const gamesService = {
  async findAll(month?: string) {
    const where: Record<string, unknown> = {};
    if (month) {
      const [year, mon] = month.split("-").map(Number);
      where.date = {
        gte: new Date(Date.UTC(year, mon - 1, 1)),
        lt: new Date(Date.UTC(year, mon, 1)),
      };
    }
    return prisma.game.findMany({
      where,
      orderBy: { date: "desc" },
      include: { sets: { orderBy: { setNumber: "asc" } } },
    });
  },

  async findById(id: string) {
    const game = await prisma.game.findUnique({
      where: { id },
      include: { sets: { orderBy: { setNumber: "asc" } } },
    });
    if (!game) throw new AppError("Jogo não encontrado", 404);
    return game;
  },

  async getStats(month?: string) {
    const games = await this.findAll(month);
    const total = games.length;
    const vitorias = games.filter((g) => g.result === "vitoria").length;
    const derrotas = games.filter((g) => g.result === "derrota").length;
    const empates = games.filter((g) => g.result === "empate").length;
    const totalPoints = games.reduce((s, g) => s + g.scorePegasus, 0);
    const totalConceded = games.reduce((s, g) => s + g.scoreOpponent, 0);
    return { total, vitorias, derrotas, empates, totalPoints, totalConceded };
  },

  async create(payload: GamePayload) {
    const data = buildData(payload);
    return prisma.game.create({ data, include: { sets: true } });
  },

  async upsertSet(gameId: string, payload: GameSetPayload) {
    await this.findById(gameId);
    if (payload.scorePegasus < 0 || payload.scoreOpponent < 0) throw new AppError("Placar do set não pode ser negativo", 400);
    return prisma.gameSet.upsert({
      where: { gameId_setNumber: { gameId, setNumber: payload.setNumber } },
      update: { scorePegasus: payload.scorePegasus, scoreOpponent: payload.scoreOpponent },
      create: { gameId, setNumber: payload.setNumber, scorePegasus: payload.scorePegasus, scoreOpponent: payload.scoreOpponent },
    });
  },

  async deleteSet(gameId: string, setNumber: number) {
    await prisma.gameSet.deleteMany({ where: { gameId, setNumber } });
  },

  async update(id: string, payload: Partial<GamePayload>) {
    const current = await this.findById(id);
    const scorePegasus = payload.scorePegasus ?? current.scorePegasus;
    const scoreOpponent = payload.scoreOpponent ?? current.scoreOpponent;
    const scoresUpdated = payload.scorePegasus !== undefined || payload.scoreOpponent !== undefined;

    const data: Record<string, unknown> = {};
    if (payload.date !== undefined) data.date = new Date(payload.date);
    if (payload.opponent !== undefined) data.opponent = payload.opponent.trim();
    if (payload.location !== undefined) data.location = payload.location;
    if (payload.scorePegasus !== undefined) data.scorePegasus = payload.scorePegasus;
    if (payload.scoreOpponent !== undefined) data.scoreOpponent = payload.scoreOpponent;
    if (payload.notes !== undefined) data.notes = payload.notes?.trim() || null;
    // Só recalcula resultado se placar foi atualizado, senão preserva (pode estar "pendente")
    data.result = scoresUpdated ? calcResult(scorePegasus, scoreOpponent) : current.result;

    return prisma.game.update({ where: { id }, data, include: { sets: { orderBy: { setNumber: "asc" } } } });
  },

  async delete(id: string) {
    await this.findById(id);
    return prisma.game.delete({ where: { id } });
  },
};
