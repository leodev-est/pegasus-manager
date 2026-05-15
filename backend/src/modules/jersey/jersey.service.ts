import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";

const allowedGenders = ["masculino", "feminino"] as const;
type Gender = (typeof allowedGenders)[number];

function validateGender(gender: string): asserts gender is Gender {
  if (!allowedGenders.includes(gender as Gender)) {
    throw new AppError("Gênero inválido", 400);
  }
}

export const jerseyService = {
  async findAll(gender: string) {
    validateGender(gender);
    return prisma.jerseyAssignment.findMany({
      where: { gender },
      include: { athlete: { select: { id: true, name: true, gender: true, status: true } } },
      orderBy: { number: "asc" },
    });
  },

  async assign(number: number, gender: string, athleteId: string) {
    validateGender(gender);

    if (number < 1 || number > 99) {
      throw new AppError("Número deve ser entre 1 e 99", 400);
    }

    const athlete = await prisma.athlete.findUnique({ where: { id: athleteId } });
    if (!athlete) throw new AppError("Atleta não encontrado", 404);
    if (athlete.status === "inativo") throw new AppError("Atleta inativo não pode receber camisa", 400);
    if (athlete.gender !== gender) {
      throw new AppError(`Atleta não pertence ao elenco ${gender}`, 400);
    }

    return prisma.jerseyAssignment.upsert({
      where: { number_gender: { number, gender } },
      update: { athleteId },
      create: { number, gender, athleteId },
      include: { athlete: { select: { id: true, name: true, gender: true, status: true } } },
    });
  },

  async unassign(number: number, gender: string) {
    validateGender(gender);
    const existing = await prisma.jerseyAssignment.findUnique({
      where: { number_gender: { number, gender } },
    });
    if (!existing) return null;
    return prisma.jerseyAssignment.delete({ where: { number_gender: { number, gender } } });
  },

  async unassignAthlete(athleteId: string) {
    return prisma.jerseyAssignment.deleteMany({ where: { athleteId } });
  },
};
