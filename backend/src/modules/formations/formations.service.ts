import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";

const formationSlots = ["levantador", "oposto", "ponteiro1", "ponteiro2", "central", "libero"] as const;

type FormationPositions = Partial<Record<(typeof formationSlots)[number], string | null>>;

type FormationPayload = {
  name?: string;
  createdBy?: string;
  positions?: unknown;
};

function normalizePositions(value: unknown, required: boolean) {
  if (value === undefined) {
    if (required) throw new AppError("Posições da formação são obrigatórias", 400);
    return undefined;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError("Posições da formação devem ser um objeto", 400);
  }

  const rawPositions = value as Record<string, unknown>;
  const positions: FormationPositions = {};

  for (const slot of formationSlots) {
    const playerId = rawPositions[slot];

    if (playerId === undefined || playerId === null || playerId === "") {
      positions[slot] = null;
      continue;
    }

    if (typeof playerId !== "string") {
      throw new AppError("Cada posição deve receber o id de um atleta", 400);
    }

    positions[slot] = playerId;
  }

  return positions as Prisma.InputJsonValue;
}

function buildData(payload: FormationPayload, requireBaseFields: boolean) {
  const data: Prisma.FormationUncheckedCreateInput | Prisma.FormationUncheckedUpdateInput = {};

  if (requireBaseFields && !payload.name?.trim()) {
    throw new AppError("Nome da formação é obrigatório", 400);
  }

  if (requireBaseFields && !payload.createdBy?.trim()) {
    throw new AppError("Criado por é obrigatório", 400);
  }

  if (payload.name !== undefined) {
    const name = payload.name.trim();
    if (!name) throw new AppError("Nome da formação é obrigatório", 400);
    data.name = name;
  }

  if (payload.createdBy !== undefined) {
    const createdBy = payload.createdBy.trim();
    if (!createdBy) throw new AppError("Criado por é obrigatório", 400);
    data.createdBy = createdBy;
  }

  const positions = normalizePositions(payload.positions, requireBaseFields);
  if (positions !== undefined) data.positions = positions;

  return data;
}

export const formationsService = {
  async findAll() {
    return prisma.formation.findMany({
      orderBy: { createdAt: "desc" },
    });
  },

  async findById(id: string) {
    const formation = await prisma.formation.findUnique({ where: { id } });

    if (!formation) {
      throw new AppError("Formação não encontrada", 404);
    }

    return formation;
  },

  async create(payload: FormationPayload) {
    const data = buildData(payload, true) as Prisma.FormationUncheckedCreateInput;
    return prisma.formation.create({ data });
  },

  async update(id: string, payload: FormationPayload) {
    await this.findById(id);
    const data = buildData(payload, false) as Prisma.FormationUncheckedUpdateInput;
    return prisma.formation.update({ where: { id }, data });
  },

  async delete(id: string) {
    await this.findById(id);
    await prisma.formation.delete({ where: { id } });
  },
};
