import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";

type SpreadsheetPayload = {
  name?: string;
  url?: string;
  description?: string | null;
};

function normalizeOptional(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function validateUrl(url?: string) {
  if (!url?.trim()) {
    throw new AppError("URL da planilha é obrigatória", 400);
  }

  try {
    const parsed = new URL(url.trim());

    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("invalid protocol");
    }

    return parsed.toString();
  } catch {
    throw new AppError("Informe uma URL válida para a planilha", 400);
  }
}

function buildData(payload: SpreadsheetPayload, requireAll: boolean) {
  const data: Prisma.SpreadsheetUncheckedCreateInput | Prisma.SpreadsheetUncheckedUpdateInput = {};

  if (requireAll && !payload.name?.trim()) {
    throw new AppError("Nome da planilha é obrigatório", 400);
  }

  if (payload.name !== undefined) {
    const name = payload.name.trim();

    if (!name) {
      throw new AppError("Nome da planilha é obrigatório", 400);
    }

    data.name = name;
  }

  if (payload.url !== undefined || requireAll) {
    data.url = validateUrl(payload.url);
  }

  if (payload.description !== undefined) {
    data.description = normalizeOptional(payload.description);
  }

  return data;
}

export const spreadsheetsService = {
  async findAll() {
    return prisma.spreadsheet.findMany({
      orderBy: { createdAt: "desc" },
    });
  },

  async create(payload: SpreadsheetPayload) {
    const data = buildData(payload, true) as Prisma.SpreadsheetUncheckedCreateInput;

    return prisma.spreadsheet.create({ data });
  },

  async update(id: string, payload: SpreadsheetPayload) {
    await this.findById(id);
    const data = buildData(payload, false) as Prisma.SpreadsheetUncheckedUpdateInput;

    return prisma.spreadsheet.update({
      where: { id },
      data,
    });
  },

  async findById(id: string) {
    const spreadsheet = await prisma.spreadsheet.findUnique({
      where: { id },
    });

    if (!spreadsheet) {
      throw new AppError("Planilha não encontrada", 404);
    }

    return spreadsheet;
  },

  async delete(id: string) {
    await this.findById(id);
    await prisma.spreadsheet.delete({
      where: { id },
    });
  },
};
