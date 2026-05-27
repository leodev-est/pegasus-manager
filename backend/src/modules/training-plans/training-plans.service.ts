import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";

export interface Exercise {
  name: string;
  sets: string;
  reps: string;
  notes?: string;
}

export const trainingPlansService = {
  async list(athleteId?: string) {
    return prisma.trainingPlan.findMany({
      where: athleteId ? { athleteId } : undefined,
      include: { athlete: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
  },

  async getActivePlan(athleteId: string) {
    return prisma.trainingPlan.findFirst({
      where: { athleteId, active: true },
      orderBy: { createdAt: "desc" },
    });
  },

  async create(data: {
    athleteId: string;
    title: string;
    description?: string;
    goals?: string;
    exercises?: Exercise[];
    startDate?: string;
    endDate?: string;
    createdBy?: string;
  }) {
    if (!data.title?.trim()) throw new AppError("Título é obrigatório.", 400);
    const athlete = await prisma.athlete.findUnique({ where: { id: data.athleteId } });
    if (!athlete) throw new AppError("Atleta não encontrado.", 404);

    return prisma.trainingPlan.create({
      data: {
        athleteId: data.athleteId,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        goals: data.goals?.trim() || null,
        exercises: (data.exercises ?? []) as unknown as Prisma.InputJsonValue,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        createdBy: data.createdBy || null,
      },
      include: { athlete: { select: { id: true, name: true } } },
    });
  },

  async update(id: string, data: {
    title?: string;
    description?: string;
    goals?: string;
    exercises?: Exercise[];
    startDate?: string | null;
    endDate?: string | null;
    active?: boolean;
  }) {
    const plan = await prisma.trainingPlan.findUnique({ where: { id } });
    if (!plan) throw new AppError("Plano não encontrado.", 404);

    return prisma.trainingPlan.update({
      where: { id },
      data: {
        title: data.title?.trim(),
        description: data.description !== undefined ? data.description.trim() || null : undefined,
        goals: data.goals !== undefined ? data.goals.trim() || null : undefined,
        exercises: data.exercises as unknown as Prisma.InputJsonValue | undefined,
        startDate: data.startDate === null ? null : data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate === null ? null : data.endDate ? new Date(data.endDate) : undefined,
        active: data.active,
      },
      include: { athlete: { select: { id: true, name: true } } },
    });
  },

  async remove(id: string) {
    const plan = await prisma.trainingPlan.findUnique({ where: { id } });
    if (!plan) throw new AppError("Plano não encontrado.", 404);
    await prisma.trainingPlan.delete({ where: { id } });
  },
};
