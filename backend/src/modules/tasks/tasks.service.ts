import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";

const statusByArea = {
  management: ["todo", "doing", "done"],
  marketing: ["ideas", "production", "review", "scheduled", "published"],
} as const;
const allowedPriorities = ["baixa", "media", "alta"] as const;
const allowedAreas = ["management", "marketing"] as const;

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
};

type TaskPayload = {
  title?: string;
  description?: string | null;
  status?: string;
  area?: string;
  assignedTo?: string | null;
  dueDate?: string | null;
  priority?: TaskPriority;
  channel?: string | null;
  labels?: unknown;
  comments?: unknown;
  checklist?: unknown;
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
    where.assignedTo = filters.assignedTo;
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

  if (payload.description !== undefined) data.description = normalizeOptional(payload.description);
  if (payload.status !== undefined) data.status = payload.status;
  if (payload.area !== undefined) data.area = area;
  if (payload.assignedTo !== undefined) data.assignedTo = normalizeOptional(payload.assignedTo);
  if (payload.dueDate !== undefined) data.dueDate = parseDate(payload.dueDate, area !== "marketing");
  if (payload.priority !== undefined) data.priority = payload.priority;
  if (payload.channel !== undefined) data.channel = normalizeOptional(payload.channel);
  if (payload.labels !== undefined) data.labels = normalizeStringArray(payload.labels, "Labels");
  if (payload.comments !== undefined) data.comments = normalizeJsonArray(payload.comments, "Comentários");
  if (payload.checklist !== undefined) data.checklist = normalizeJsonArray(payload.checklist, "Checklist");

  return data;
}

export const tasksService = {
  resolveArea: resolveTaskArea,

  async findAll(filters: TaskFilters) {
    return prisma.task.findMany({
      where: buildWhere(filters),
      orderBy: [
        { status: "asc" },
        { dueDate: "asc" },
        { createdAt: "desc" },
      ],
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

    const data = buildData(payload, area, false) as Prisma.TaskUncheckedUpdateInput;

    return prisma.task.update({
      where: { id },
      data,
    });
  },

  async updateStatus(id: string, status: string) {
    const task = await this.findById(id);
    const area = resolveTaskArea(task.area);
    validateStatus(status, area);

    return prisma.task.update({
      where: { id },
      data: {
        status,
      },
    });
  },

  async delete(id: string) {
    await this.findById(id);
    await prisma.task.delete({
      where: { id },
    });
  },

  async approve(id: string, action: "schedule" | "publish", scheduledAt?: string) {
    await this.findById(id);

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
        data: { approvalStatus: "approved", status: "scheduled", scheduledAt: date },
      });
    }

    return prisma.task.update({
      where: { id },
      data: { approvalStatus: "approved", status: "published", scheduledAt: null },
    });
  },

  async reject(id: string) {
    await this.findById(id);
    return prisma.task.update({
      where: { id },
      data: { approvalStatus: "rejected", status: "production" },
    });
  },

  async publishScheduled() {
    const now = new Date();
    await prisma.task.updateMany({
      where: {
        area: "marketing",
        approvalStatus: "approved",
        scheduledAt: { lte: now },
        status: "scheduled",
      },
      data: { status: "published" },
    });
  },
};


