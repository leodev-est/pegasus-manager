import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";

const VALID_TYPES = ["muscular", "articular", "óssea", "tendão", "outro"];
const VALID_SEVERITIES = ["leve", "moderada", "grave"];

export const injuriesService = {
  async list(athleteId?: string) {
    return prisma.injury.findMany({
      where: athleteId ? { athleteId } : undefined,
      include: { athlete: { select: { id: true, name: true } } },
      orderBy: { startDate: "desc" },
    });
  },

  async listForAthlete(athleteId: string) {
    return prisma.injury.findMany({
      where: { athleteId },
      orderBy: { startDate: "desc" },
    });
  },

  async create(data: {
    athleteId: string;
    type: string;
    severity: string;
    description?: string;
    startDate: string;
    expectedReturn?: string;
    notes?: string;
    createdBy?: string;
  }) {
    if (!VALID_TYPES.includes(data.type)) throw new AppError("Tipo de lesão inválido.", 400);
    if (!VALID_SEVERITIES.includes(data.severity)) throw new AppError("Gravidade inválida.", 400);
    if (!data.startDate) throw new AppError("Data de início é obrigatória.", 400);

    const athlete = await prisma.athlete.findUnique({ where: { id: data.athleteId } });
    if (!athlete) throw new AppError("Atleta não encontrado.", 404);

    return prisma.injury.create({
      data: {
        athleteId: data.athleteId,
        type: data.type,
        severity: data.severity,
        description: data.description?.trim() || null,
        startDate: new Date(data.startDate),
        expectedReturn: data.expectedReturn ? new Date(data.expectedReturn) : null,
        notes: data.notes?.trim() || null,
        createdBy: data.createdBy || null,
      },
      include: { athlete: { select: { id: true, name: true } } },
    });
  },

  async update(id: string, data: {
    returnedAt?: string | null;
    expectedReturn?: string | null;
    notes?: string;
    severity?: string;
    description?: string;
  }) {
    const injury = await prisma.injury.findUnique({ where: { id } });
    if (!injury) throw new AppError("Lesão não encontrada.", 404);
    if (data.severity && !VALID_SEVERITIES.includes(data.severity)) {
      throw new AppError("Gravidade inválida.", 400);
    }

    return prisma.injury.update({
      where: { id },
      data: {
        returnedAt: data.returnedAt === null ? null : data.returnedAt ? new Date(data.returnedAt) : undefined,
        expectedReturn: data.expectedReturn === null ? null : data.expectedReturn ? new Date(data.expectedReturn) : undefined,
        notes: data.notes !== undefined ? data.notes.trim() || null : undefined,
        severity: data.severity,
        description: data.description !== undefined ? data.description.trim() || null : undefined,
      },
      include: { athlete: { select: { id: true, name: true } } },
    });
  },

  async remove(id: string) {
    const injury = await prisma.injury.findUnique({ where: { id } });
    if (!injury) throw new AppError("Lesão não encontrada.", 404);
    await prisma.injury.delete({ where: { id } });
  },

  async getActiveForAthletes(athleteIds: string[]): Promise<Set<string>> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const active = await prisma.injury.findMany({
      where: {
        athleteId: { in: athleteIds },
        startDate: { lte: today },
        returnedAt: null,
      },
      select: { athleteId: true },
    });
    return new Set(active.map((i) => i.athleteId));
  },
};
