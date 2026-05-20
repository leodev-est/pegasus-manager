import { prisma } from "../../config/prisma";
import { pushService } from "../push/push.service";
import { AppError } from "../../middlewares/error.middleware";

const VALID_STATUSES = ["convocado", "presente", "ausente"] as const;

function formatGameDate(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
  });
}

export const gameConvocationsService = {
  async getByGame(gameId: string, gender?: string) {
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) throw new AppError("Jogo não encontrado", 404);

    const where: Record<string, unknown> = { status: "ativo" };
    if (gender && gender !== "misto") {
      where.gender = gender;
    }

    const athletes = await prisma.athlete.findMany({
      where,
      select: { id: true, name: true, category: true, position: true, gender: true },
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

  async getMyConvocations(athleteId: string) {
    const now = new Date();
    return prisma.gameConvocation.findMany({
      where: {
        athleteId,
        status: { in: ["convocado", "presente"] },
        game: { date: { gte: now } },
      },
      include: {
        game: true,
      },
      orderBy: { game: { date: "asc" } },
    });
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

  async bulkSetAndNotify(gameId: string, athleteIds: string[]) {
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) throw new AppError("Jogo não encontrado", 404);

    await prisma.gameConvocation.deleteMany({ where: { gameId } });

    if (athleteIds.length > 0) {
      await prisma.gameConvocation.createMany({
        data: athleteIds.map((athleteId) => ({ gameId, athleteId, status: "convocado" })),
        skipDuplicates: true,
      });
    }

    // Notifica atletas convocados que têm usuário vinculado
    const athletes = await prisma.athlete.findMany({
      where: { id: { in: athleteIds } },
      select: { user: { select: { id: true } } },
    });

    const gameDate = formatGameDate(new Date(game.date));

    await Promise.all(
      athletes
        .filter((a) => a.user?.id)
        .map(async (a) => {
          const notification = await prisma.notification.create({
            data: {
              userId: a.user!.id,
              title: "Você foi convocado!",
              message: `Você está convocado para o amistoso contra ${game.opponent} em ${gameDate}.`,
              type: "treino",
            },
          });
          pushService
            .sendToUser(notification.userId, { title: notification.title, body: notification.message })
            .catch(() => {});
        }),
    );

    return prisma.gameConvocation.findMany({ where: { gameId } });
  },
};
