import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";
import { logTaskEvent } from "./tasks-history";

const statusByArea = {
  management: ["todo", "doing", "done"],
  marketing: ["ideas", "production", "review", "scheduled", "published"],
} as const;
const allowedPriorities = ["baixa", "media", "alta"] as const;
const allowedFormats = ["video", "video_arte", "arte", "evento", "tarefa"] as const;
// Marketing: só se chega a Agendado/Publicado pelo fluxo de aprovação (approve/publishScheduled).
const approvalOnlyStatuses = ["scheduled", "published"];
const allowedAreas = ["management", "marketing"] as const;
/** Publicados há mais que isso saem da visão padrão (o front usa o mesmo número). */
const ARCHIVE_PUBLISHED_AFTER_DAYS = 30;

export type TaskArea = (typeof allowedAreas)[number];
export type TaskPriority = (typeof allowedPriorities)[number];
export type TaskStatus = (typeof statusByArea)[TaskArea][number];

type TaskFilters = {
  area?: string;
  status?: string;
  assignedTo?: string;
  priority?: string;
  search?: string;
  channel?: string;
  includeArchived?: boolean;
};

type TaskPayload = {
  title?: string;
  description?: string | null;
  status?: string;
  area?: string;
  assignedTo?: string[] | null;
  dueDate?: string | null;
  priority?: TaskPriority;
  channel?: string | null;
  labels?: unknown;
  comments?: unknown;
  checklist?: unknown;
  format?: string | null;
  stagesDone?: unknown;
};

function normalizeOptional(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseDate(value: string | null | undefined, pastAllowed = true) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new AppError("Prazo inválido", 400);
  }

  if (!pastAllowed) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      throw new AppError("O prazo não pode ser uma data anterior a hoje", 400);
    }
  }

  return date;
}

function normalizeStringArray(value: unknown, field: string) {
  if (value === undefined) return undefined;

  if (!Array.isArray(value)) {
    throw new AppError(`${field} deve ser uma lista`, 400);
  }

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function normalizeJsonArray(value: unknown, field: string) {
  if (value === undefined) return undefined;

  if (!Array.isArray(value)) {
    throw new AppError(`${field} deve ser uma lista`, 400);
  }

  return value as Prisma.InputJsonValue;
}

export function resolveTaskArea(area?: string): TaskArea {
  const nextArea = area ?? "management";

  if (!allowedAreas.includes(nextArea as TaskArea)) {
    throw new AppError("Área deve ser management ou marketing", 400);
  }

  return nextArea as TaskArea;
}

function validateStatus(status: string | undefined, area: TaskArea) {
  if (status && !(statusByArea[area] as readonly string[]).includes(status)) {
    const allowed = statusByArea[area].join(", ");
    throw new AppError(`Status para ${area} deve ser ${allowed}`, 400);
  }
}

function validateFormat(format: string | null | undefined) {
  if (format && !allowedFormats.includes(format as (typeof allowedFormats)[number])) {
    throw new AppError(`Formato deve ser ${allowedFormats.join(", ")}`, 400);
  }
}

/** Todo card de marketing passa pela Revisão: Agendado/Publicado só via aprovação. */
function ensureNotSkippingApproval(area: TaskArea, nextStatus: string | undefined, currentStatus?: string) {
  if (area !== "marketing" || !nextStatus || nextStatus === currentStatus) return;
  if (approvalOnlyStatuses.includes(nextStatus)) {
    throw new AppError("Esse card precisa ser aprovado na Revisão antes de ser agendado ou publicado", 400);
  }
  if (currentStatus === "scheduled") {
    throw new AppError("Card agendado só sai da coluna ao ser publicado", 400);
  }
}

function validatePriority(priority?: string) {
  if (priority && !allowedPriorities.includes(priority as TaskPriority)) {
    throw new AppError("Prioridade deve ser baixa, média ou alta", 400);
  }
}

function buildWhere(filters: TaskFilters) {
  const area = resolveTaskArea(filters.area);
  const where: Prisma.TaskWhereInput = {
    area,
  };

  if (filters.status) {
    validateStatus(filters.status, area);
    where.status = filters.status;
  }

  if (filters.assignedTo) {
    where.assignedTo = { has: filters.assignedTo };
  }

  if (filters.priority) {
    validatePriority(filters.priority);
    where.priority = filters.priority;
  }

  if (filters.channel) {
    where.channel = filters.channel;
  }

  if (filters.search?.trim()) {
    const search = filters.search.trim();
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  if (area === "marketing" && !filters.includeArchived) {
    const cutoff = new Date(Date.now() - ARCHIVE_PUBLISHED_AFTER_DAYS * 86_400_000);
    where.archivedAt = null;
    // Publicado há mais de 30 dias = arquivado automaticamente (sem job, sem mexer no dado).
    where.NOT = {
      status: "published",
      OR: [{ statusChangedAt: { lt: cutoff } }, { statusChangedAt: null, updatedAt: { lt: cutoff } }],
    };
  }

  return where;
}

function buildData(payload: TaskPayload, area: TaskArea, requireTitle: boolean) {
  const data: Prisma.TaskUncheckedCreateInput | Prisma.TaskUncheckedUpdateInput = {};

  if (requireTitle && !payload.title?.trim()) {
    throw new AppError("Título da tarefa é obrigatório", 400);
  }

  if (payload.title !== undefined) {
    const title = payload.title.trim();

    if (!title) {
      throw new AppError("Título da tarefa é obrigatório", 400);
    }

    data.title = title;
  }

  validateStatus(payload.status, area);
  validatePriority(payload.priority);
  validateFormat(payload.format);

  if (payload.description !== undefined) data.description = normalizeOptional(payload.description);
  if (payload.status !== undefined) data.status = payload.status;
  if (payload.area !== undefined) data.area = area;
  if (payload.assignedTo !== undefined) {
    data.assignedTo = normalizeStringArray(payload.assignedTo ?? [], "Responsáveis") ?? [];
  }
  if (payload.dueDate !== undefined) data.dueDate = parseDate(payload.dueDate, area !== "marketing");
  if (payload.priority !== undefined) data.priority = payload.priority;
  if (payload.channel !== undefined) data.channel = normalizeOptional(payload.channel);
  if (payload.labels !== undefined) data.labels = normalizeStringArray(payload.labels, "Labels");
  if (payload.comments !== undefined) data.comments = normalizeJsonArray(payload.comments, "Comentários");
  if (payload.checklist !== undefined) data.checklist = normalizeJsonArray(payload.checklist, "Checklist");
  if (payload.format !== undefined) data.format = normalizeOptional(payload.format);
  if (payload.stagesDone !== undefined) data.stagesDone = normalizeStringArray(payload.stagesDone, "Sub-etapas");

  return data;
}

const POSITION_STEP = 1024;
const MAX_NEW_COMMENTS_PER_EDIT = 10;

export function buildComment(text: string, author: { id: string; name: string }) {
  return {
    id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    author: author.name,
    authorId: author.id,
    createdAt: new Date().toISOString(),
  };
}

/**
 * PATCH may only ADD comments: existing ones stay exactly as stored (no editing, deleting or
 * forging authors), and new ones are rebuilt here with the logged-in author.
 */
export function mergeIncomingComments(stored: unknown, incoming: unknown, author: { id: string; name: string }) {
  const existing = Array.isArray(stored) ? (stored as Array<{ id?: unknown }>) : [];
  if (!Array.isArray(incoming)) throw new AppError("Comentários deve ser uma lista", 400);
  const knownIds = new Set(existing.map((comment) => String(comment.id)));
  const added = (incoming as Array<{ id?: unknown; text?: unknown }>)
    .filter((comment) => !knownIds.has(String(comment?.id)))
    .map((comment) => (typeof comment?.text === "string" ? comment.text.trim() : ""))
    .filter(Boolean);
  if (added.length > MAX_NEW_COMMENTS_PER_EDIT) throw new AppError("Comentários demais de uma vez", 400);
  if (added.some((text) => text.length > 2000)) throw new AppError("Comentário deve ter até 2000 caracteres", 400);
  return [...existing, ...added.map((text) => buildComment(text, author))];
}

/** Same order the board shows: hand-sorted first (position), then by due date and newest. */
const columnOrder: Prisma.TaskOrderByWithRelationInput[] = [
  { position: { sort: "asc", nulls: "last" } },
  { dueDate: { sort: "asc", nulls: "last" } },
  { createdAt: "desc" },
];

/** Position that puts a card at the top of a column, or null while the column has no hand order. */
async function topPosition(area: string, status: string) {
  const { _min } = await prisma.task.aggregate({
    where: { area, status, position: { not: null } },
    _min: { position: true },
  });
  return _min.position === null ? null : _min.position - POSITION_STEP;
}

/** Gives every card in the column a spaced position, keeping the current order. */
async function normalizeColumn(area: string, status: string) {
  const column = await prisma.task.findMany({
    where: { area, status },
    orderBy: columnOrder,
    select: { id: true },
  });
  // Raw SQL: ordering is not an edit, so "updatedAt" (used by auto-archive) stays as it was.
  await prisma.$transaction(
    column.map(
      (task, index) => prisma.$executeRaw`UPDATE "Task" SET "position" = ${index * POSITION_STEP} WHERE "id" = ${task.id}`,
    ),
  );
}

export const tasksService = {
  resolveArea: resolveTaskArea,

  async findAll(filters: TaskFilters) {
    return prisma.task.findMany({
      where: buildWhere(filters),
      orderBy: [{ status: "asc" }, ...columnOrder],
    });
  },

  async findById(id: string) {
    const task = await prisma.task.findUnique({
      where: { id },
    });

    if (!task || !allowedAreas.includes(task.area as TaskArea)) {
      throw new AppError("Tarefa não encontrada", 404);
    }

    return task;
  },

  async create(payload: TaskPayload) {
    const area = resolveTaskArea(payload.area);
    const defaultStatus = area === "marketing" ? "ideas" : "todo";
    const data = buildData(
      {
        area,
        status: defaultStatus,
        priority: "media",
        ...payload,
      },
      area,
      true,
    ) as Prisma.TaskUncheckedCreateInput;
    ensureNotSkippingApproval(area, data.status);
    data.statusChangedAt = new Date();
    data.position = await topPosition(area, data.status ?? defaultStatus);

    return prisma.task.create({
      data,
    });
  },

  async update(id: string, payload: TaskPayload) {
    const task = await this.findById(id);
    const area = resolveTaskArea(task.area);

    if (payload.area !== undefined && payload.area !== task.area) {
      throw new AppError("Area da tarefa não pode ser alterada", 400);
    }

    // Re-sending the same (possibly past) due date is not a change: don't reject the whole edit.
    const sameDueDate =
      typeof payload.dueDate === "string" &&
      task.dueDate !== null &&
      payload.dueDate.slice(0, 10) === task.dueDate.toISOString().slice(0, 10);
    const data = buildData(
      sameDueDate ? { ...payload, dueDate: undefined } : payload,
      area,
      false,
    ) as Prisma.TaskUncheckedUpdateInput;
    ensureNotSkippingApproval(area, payload.status, task.status);
    if (payload.status !== undefined && payload.status !== task.status) {
      data.statusChangedAt = new Date();
      data.position = await topPosition(task.area, payload.status);
    }

    return prisma.task.update({
      where: { id },
      data,
    });
  },

  async updateStatus(id: string, status: string) {
    const task = await this.findById(id);
    const area = resolveTaskArea(task.area);
    validateStatus(status, area);
    ensureNotSkippingApproval(area, status, task.status);

    return prisma.task.update({
      where: { id },
      data: {
        status,
        ...(status !== task.status
          ? { statusChangedAt: new Date(), position: await topPosition(task.area, status) }
          : {}),
      },
    });
  },

  /**
   * Places a card between two neighbours of its current column: `beforeId` is the card right
   * above it, `afterId` the card right below (either may be missing at the ends).
   */
  async reorder(id: string, neighbours: { beforeId?: string | null; afterId?: string | null }) {
    const task = await this.findById(id);
    const neighbourIds = [neighbours.beforeId, neighbours.afterId].filter((value): value is string => Boolean(value));
    if (neighbourIds.includes(id)) throw new AppError("Vizinho inválido", 400);

    const loadNeighbours = async () => {
      const found = await prisma.task.findMany({
        where: { id: { in: neighbourIds }, area: task.area, status: task.status },
        select: { id: true, position: true },
      });
      if (found.length !== neighbourIds.length) {
        throw new AppError("Os cards vizinhos precisam estar na mesma coluna", 400);
      }
      return {
        before: found.find((item) => item.id === neighbours.beforeId)?.position,
        after: found.find((item) => item.id === neighbours.afterId)?.position,
      };
    };

    const hasUnsorted = await prisma.task.count({
      where: { area: task.area, status: task.status, position: null },
    });
    if (hasUnsorted > 0) await normalizeColumn(task.area, task.status);

    let { before, after } = await loadNeighbours();
    const compute = () => {
      if (before != null && after != null) return (before + after) / 2;
      if (before != null) return before + POSITION_STEP;
      if (after != null) return after - POSITION_STEP;
      return 0;
    };
    let position = compute();
    // Too many reorders in the same gap: respace the column and try again.
    if (before != null && after != null && Math.abs(after - before) < 1e-6) {
      await normalizeColumn(task.area, task.status);
      ({ before, after } = await loadNeighbours());
      position = compute();
    }

    await prisma.$executeRaw`UPDATE "Task" SET "position" = ${position} WHERE "id" = ${id}`;
    return this.findById(id);
  },

  async addComment(id: string, text: string, author: { id: string; name: string }) {
    const task = await this.findById(id);
    const body = text.trim();
    if (!body) throw new AppError("Escreva o comentário", 400);
    if (body.length > 2000) throw new AppError("Comentário deve ter até 2000 caracteres", 400);

    const comment = buildComment(body, author);

    // Row lock: two people commenting at the same time must not overwrite each other.
    const updated = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Task" WHERE "id" = ${task.id} FOR UPDATE`;
      const current = await tx.task.findUniqueOrThrow({ where: { id: task.id }, select: { comments: true } });
      const comments = [...(Array.isArray(current.comments) ? current.comments : []), comment];
      return tx.task.update({ where: { id: task.id }, data: { comments: comments as Prisma.InputJsonValue } });
    });
    return { task: updated, comment };
  },

  async setArchived(id: string, archived: boolean) {
    await this.findById(id);
    return prisma.task.update({
      where: { id },
      data: { archivedAt: archived ? new Date() : null },
    });
  },

  async delete(id: string) {
    await this.findById(id);
    await prisma.task.delete({
      where: { id },
    });
  },

  async approve(id: string, action: "schedule" | "publish", scheduledAt?: string) {
    const task = await this.findById(id);
    const canApproveFrom = action === "publish" ? ["review", "scheduled"] : ["review"];
    if (task.area !== "marketing" || !canApproveFrom.includes(task.status)) {
      throw new AppError("Só cards em Revisão podem ser aprovados", 400);
    }

    if (action === "schedule") {
      if (!scheduledAt) {
        throw new AppError("scheduledAt é obrigatório para agendamento", 400);
      }
      const date = new Date(scheduledAt);
      if (Number.isNaN(date.getTime())) {
        throw new AppError("scheduledAt inválido", 400);
      }
      return prisma.task.update({
        where: { id },
        data: {
          approvalStatus: "approved",
          status: "scheduled",
          scheduledAt: date,
          statusChangedAt: new Date(),
          position: await topPosition(task.area, "scheduled"),
        },
      });
    }

    return prisma.task.update({
      where: { id },
      data: {
        approvalStatus: "approved",
        status: "published",
        scheduledAt: null,
        statusChangedAt: new Date(),
        position: await topPosition(task.area, "published"),
      },
    });
  },

  async reject(id: string) {
    const task = await this.findById(id);
    if (task.area !== "marketing" || (task.status !== "review" && task.status !== "scheduled")) {
      throw new AppError("Só cards em Revisão ou Agendado podem voltar para Produção", 400);
    }
    return prisma.task.update({
      where: { id },
      data: {
        approvalStatus: "rejected",
        status: "production",
        scheduledAt: null,
        statusChangedAt: new Date(),
        position: await topPosition(task.area, "production"),
      },
    });
  },

  async publishScheduled() {
    const now = new Date();
    const where: Prisma.TaskWhereInput = {
      area: "marketing",
      approvalStatus: "approved",
      scheduledAt: { lte: now },
      status: "scheduled",
    };
    const due = await prisma.task.findMany({ where, select: { id: true, title: true } });
    if (due.length === 0) return;
    await prisma.task.updateMany({
      where: { ...where, id: { in: due.map((task) => task.id) } },
      data: { status: "published", statusChangedAt: now },
    });
    // Histórico: publicado pelo agendamento, sem pessoa.
    due.forEach((task) => logTaskEvent(null, task, "publish", { automatic: true }));
  },
};


