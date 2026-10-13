import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";
import { isContentFormat, normalizeLinks, normalizeNameList } from "../marketing/marketing.shared";
import { tasksService } from "../tasks/tasks.service";

export const REFERENCE_STATUSES = ["nova", "aprovada", "gravada", "descartada"] as const;
export const REFERENCE_PLATFORMS = ["instagram", "youtube", "tiktok", "outro"] as const;

type ReferenceStatus = (typeof REFERENCE_STATUSES)[number];
type ReferencePlatform = (typeof REFERENCE_PLATFORMS)[number];

export type ReferencePayload = {
  url?: string;
  title?: string | null;
  note?: string | null;
  tags?: string[];
  platform?: string;
  status?: string;
};

type Actor = { id: string; name: string } | undefined;

const TRACKING_PARAMS = ["igsh", "igshid", "si", "feature", "fbclid", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

/** Normaliza o link (http/https, sem rastreadores, sem "/" final) pra detectar duplicados. */
export function normalizeUrl(raw: string) {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new AppError("Link inválido. Cole o endereço completo do vídeo.", 400);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new AppError("O link deve começar com http:// ou https://", 400);
  }
  for (const param of TRACKING_PARAMS) parsed.searchParams.delete(param);
  parsed.hash = "";
  let out = parsed.toString();
  if (out.endsWith("/")) out = out.slice(0, -1);
  return out;
}

export function detectPlatform(url: string): ReferencePlatform {
  const host = new URL(url).hostname.replace(/^www\./, "");
  if (host.endsWith("instagram.com")) return "instagram";
  if (host.endsWith("youtube.com") || host === "youtu.be") return "youtube";
  if (host.endsWith("tiktok.com")) return "tiktok";
  return "outro";
}

const PLATFORM_LABEL: Record<ReferencePlatform, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
  outro: "Outro",
};

function normalizeTags(value?: string[]) {
  const tags = normalizeNameList(value).map((tag) => tag.toLowerCase().replace(/^#/, "").slice(0, 30)).filter(Boolean);
  const unique = Array.from(new Set(tags));
  if (unique.length > 8) throw new AppError("No máximo 8 tags por referência", 400);
  return unique;
}

function validateStatus(status?: string): asserts status is ReferenceStatus | undefined {
  if (status !== undefined && !(REFERENCE_STATUSES as readonly string[]).includes(status)) {
    throw new AppError(`Status deve ser um de: ${REFERENCE_STATUSES.join(", ")}`, 400);
  }
}

function validatePlatform(platform?: string) {
  if (platform !== undefined && !(REFERENCE_PLATFORMS as readonly string[]).includes(platform)) {
    throw new AppError(`Plataforma deve ser uma de: ${REFERENCE_PLATFORMS.join(", ")}`, 400);
  }
}

export const referencesService = {
  async findAll(filters: { status?: string; tag?: string; search?: string }) {
    validateStatus(filters.status);
    const where: Prisma.ReferenceVideoWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.tag) where.tags = { has: filters.tag.toLowerCase().replace(/^#/, "") };
    if (filters.search?.trim()) {
      const search = filters.search.trim();
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { note: { contains: search, mode: "insensitive" } },
        { url: { contains: search, mode: "insensitive" } },
      ];
    }
    return prisma.referenceVideo.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { task: { select: { id: true, title: true, dueDate: true, status: true } } },
    });
  },

  async findById(id: string) {
    const reference = await prisma.referenceVideo.findUnique({ where: { id } });
    if (!reference) throw new AppError("Referência não encontrada", 404);
    return reference;
  },

  async create(payload: ReferencePayload, actor?: Actor) {
    if (!payload.url?.trim()) throw new AppError("Cole o link do vídeo", 400);
    validateStatus(payload.status);
    validatePlatform(payload.platform);

    const url = normalizeUrl(payload.url);
    const duplicate = await prisma.referenceVideo.findFirst({ where: { url } });
    if (duplicate) {
      throw new AppError(`Esse vídeo já está na curadoria (${duplicate.status}, adicionado por ${duplicate.addedBy}).`, 409);
    }

    const platform = (payload.platform as ReferencePlatform | undefined) ?? detectPlatform(url);
    const title = payload.title?.trim() || `Vídeo de referência (${PLATFORM_LABEL[platform]})`;

    return prisma.referenceVideo.create({
      data: {
        url,
        platform,
        title: title.slice(0, 140),
        note: payload.note?.trim() || null,
        tags: normalizeTags(payload.tags),
        status: payload.status ?? "nova",
        addedBy: actor?.name ?? "—",
      },
    });
  },

  async update(id: string, payload: ReferencePayload) {
    await this.findById(id);
    validateStatus(payload.status);
    validatePlatform(payload.platform);

    const data: Prisma.ReferenceVideoUncheckedUpdateInput = {};
    if (payload.title !== undefined) {
      const title = payload.title?.trim();
      if (!title) throw new AppError("Título é obrigatório", 400);
      data.title = title.slice(0, 140);
    }
    if (payload.note !== undefined) data.note = payload.note?.trim() || null;
    if (payload.tags !== undefined) data.tags = normalizeTags(payload.tags);
    if (payload.platform !== undefined) data.platform = payload.platform;
    if (payload.status !== undefined) data.status = payload.status;

    return prisma.referenceVideo.update({ where: { id }, data });
  },

  /** "Criar card para produção": cria um Task (kanban de marketing) na Referência já com o link guardado. */
  async toTask(id: string, payload: { date?: string; format?: string }, actor?: { id: string; name: string }) {
    const reference = await this.findById(id);
    if (reference.taskId) throw new AppError("Essa referência já tem um card de produção.", 409);
    if (!payload.date) throw new AppError("Escolha a data de publicação", 400);

    const format = payload.format ?? "video";
    if (!isContentFormat(format)) throw new AppError("Formato inválido", 400);

    const links = normalizeLinks([{ label: `Referência (${PLATFORM_LABEL[reference.platform as ReferencePlatform] ?? "link"})`, url: reference.url }]);

    const task = await tasksService.create(
      {
        title: reference.title,
        description: reference.note,
        area: "marketing",
        status: "production",
        dueDate: payload.date,
        contentFormat: format,
        links: links as unknown,
      },
      actor,
    );

    const updated = await prisma.referenceVideo.update({
      where: { id },
      data: { taskId: task.id, status: reference.status === "nova" ? "aprovada" : reference.status },
    });

    return { reference: updated, task };
  },

  async delete(id: string) {
    await this.findById(id);
    await prisma.referenceVideo.delete({ where: { id } });
  },
};
