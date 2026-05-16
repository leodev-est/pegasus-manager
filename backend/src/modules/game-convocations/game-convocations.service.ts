import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";

const VALID_STATUSES = ["convocado", "presente", "ausente"] as const;

export const gameConvocationsService = {
  async getByGame(gameId: string) {
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) throw new AppError("Jogo não encontrado", 404);

    const athletes = await prisma.athlete.findMany({
      where: { status: "ativo" },
      select: { id: true, name: true, category: true, position: true },
      orderBy: { name: "asc" },
    });

    const convocations = await prisma.gameConvocation.findMany({
      where: { gameId },
    });

    const convocMap = new Map(convocations.map((c) => [c.athleteId, c]));

    return {
      game,
      athletes: athletes.map((a) => ({
        ...a,
        convocation: convocMap.get(a.id) ?? null,
      })),
    };
  },

  async upsertConvocation(gameId: string, athleteId: string, status: string, notes?: string) {
    if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
      throw new AppError("Status inválido. Use: convocado, presente ou ausente", 400);
    }

    const [game, athlete] = await Promise.all([
      prisma.game.findUnique({ where: { id: gameId } }),
      prisma.athlete.findUnique({ where: { id: athleteId } }),
    ]);

    if (!game) throw new AppError("Jogo não encontrado", 404);
    if (!athlete) throw new AppError("Atleta não encontrado", 404);

    return prisma.gameConvocation.upsert({
      where: { gameId_athleteId: { gameId, athleteId } },
      create: { gameId, athleteId, status, notes: notes ?? null },
      update: { status, notes: notes ?? null },
    });
  },

  async removeConvocation(gameId: string, athleteId: string) {
    const existing = await prisma.gameConvocation.findUnique({
      where: { gameId_athleteId: { gameId, athleteId } },
    });
    if (!existing) throw new AppError("Convocação não encontrada", 404);
    return prisma.gameConvocation.delete({
      where: { gameId_athleteId: { gameId, athleteId } },
    });
  },

  async bulkSet(gameId: string, athleteIds: string[]) {
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) throw new AppError("Jogo não encontrado", 404);

    await prisma.gameConvocation.deleteMany({ where: { gameId } });

    if (athleteIds.length === 0) return [];

    await prisma.gameConvocation.createMany({
      data: athleteIds.map((athleteId) => ({ gameId, athleteId, status: "convocado" })),
      skipDuplicates: true,
    });

    return prisma.gameConvocation.findMany({ where: { gameId } });
  },
};
