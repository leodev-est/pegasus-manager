import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";
import { auditService } from "../audit/audit.service";
import { notifyUsersByName, notifyUsersByRole, notifyUsersForStep } from "../marketing/marketing-notify";
import {
  isContentFormat,
  isContentStep,
  nextStep as nextContentStep,
  normalizeLinks,
  normalizeStatusForFormat,
  pipelineFor,
  type ContentStep,
} from "../marketing/marketing.shared";

const CONTENT_STEP_LABEL: Record<ContentStep, string> = {
  referencia: "Referência",
  definido: "Definição",
  arte: "Arte",
  foto: "Foto",
  aprovado: "Aprovação",
  gravado: "Gravação",
  editado: "Edição",
  cobertura: "Cobertura",
  postado: "Postagem",
};

const statusByArea = {
  management: ["todo", "doing", "done"],
  marketing: ["ideas", "production", "review", "scheduled", "published"],
} as const;
const allowedPriorities = ["baixa", "media", "alta"] as const;
const allowedAreas = ["management", "marketing"] as const;

// Status final de cada área — é o que marca uma task como "pronta pra ser limpa" depois
// de ficar parada ali por TASK_RETENTION_DAYS. Fácil de ajustar se o prazo precisar mudar.
const FINISHED_STATUS_BY_AREA = {
  management: "done",
  marketing: "published",
} as const;
export const TASK_RETENTION_DAYS = 60;

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
  assignedTo?: string[] | null;
  dueDate?: string | null;
  priority?: TaskPriority;
  channel?: string | null;
  labels?: unknown;
  comments?: unknown;
  checklist?: unknown;
  links?: unknown;
  /** Posição manual dentro da coluna. Se omitida numa troca de status, vai pro fim da coluna nova. */
  position?: number;
  /** video | video_arte | so_arte | foto | evento — null/"" = tarefa solta, sem esteira. */
  contentFormat?: string | null;
  /** Etapa atual dentro da esteira do contentFormat. */
  contentStep?: string | null;
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
  if (payload.assignedTo !== undefined) {
    data.assignedTo = normalizeStringArray(payload.assignedTo ?? [], "Responsáveis") ?? [];
  }
  if (payload.dueDate !== undefined) data.dueDate = parseDate(payload.dueDate, area !== "marketing");
  if (payload.priority !== undefined) data.priority = payload.priority;
  if (payload.channel !== undefined) data.channel = normalizeOptional(payload.channel);
  if (payload.labels !== undefined) data.labels = normalizeStringArray(payload.labels, "Labels");
  if (payload.comments !== undefined) data.comments = normalizeJsonArray(payload.comments, "Comentários");
  if (payload.checklist !== undefined) data.checklist = normalizeJsonArray(payload.checklist, "Checklist");
  if (payload.links !== undefined) data.links = normalizeLinks(payload.links) as unknown as Prisma.InputJsonValue;
  if (payload.position !== undefined) {
    if (typeof payload.position !== "number" || !Number.isFinite(payload.position)) {
      throw new AppError("Posição inválida", 400);
    }
    data.position = payload.position;
  }

  return data;
}

/**
 * Decide o par (contentFormat, contentStep) final a partir do que já existia + do payload.
 * `undefined` = nada mudou nesse eixo (não toca os campos). Trocar só o formato realoca a
 * etapa pro caminho novo (mantém se existir lá, senão volta pro começo da esteira).
 */
function resolveContentFields(
  current: { contentFormat: string | null; contentStep: string | null },
  payload: TaskPayload,
): { contentFormat: string | null; contentStep: string | null } | undefined {
  if (payload.contentFormat === undefined && payload.contentStep === undefined) return undefined;

  const format = payload.contentFormat !== undefined ? payload.contentFormat || null : current.contentFormat;
  if (format !== null && !isContentFormat(format)) {
    throw new AppError("Formato de conteúdo inválido", 400);
  }
  if (!format) return { contentFormat: null, contentStep: null };

  if (payload.contentStep !== undefined) {
    const step = payload.contentStep || null;
    if (step !== null && !pipelineFor(format).includes(step as ContentStep)) {
      throw new AppError(`Essa etapa não existe pra esse formato (etapas: ${pipelineFor(format).join(" → ")})`, 400);
    }
    return { contentFormat: format, contentStep: step ?? pipelineFor(format)[0] };
  }

  const step = current.contentStep ? normalizeStatusForFormat(format, current.contentStep) : pipelineFor(format)[0];
  return { contentFormat: format, contentStep: step };
}

async function notifyTaskAssignees(title: string, before: string[], after: string[], actorId?: string) {
  const had = new Set(before.map((n) => n.toLowerCase()));
  const added = after.filter((name) => !had.has(name.toLowerCase()));
  if (added.length === 0) return;
  await notifyUsersByName(added, { title: "Você foi designado em um card", message: `"${title}"` }, actorId);
}

/** Posição pra entrar no fim de uma coluna (status) — base pra tasks novas ou movidas sem posição explícita. */
async function endOfColumnPosition(area: TaskArea, status: string) {
  const result = await prisma.task.aggregate({
    where: { area, status },
    _max: { position: true },
  });
  return (result._max.position ?? 0) + 1;
}

type RawComment = { id?: unknown; text?: unknown; author?: unknown };

function findNewComments(before: unknown, after: unknown): Array<{ text: string; author?: string }> {
  if (!Array.isArray(after)) return [];
  const beforeIds = new Set(Array.isArray(before) ? before.map((c: RawComment) => c?.id) : []);
  return after
    .filter((c: RawComment) => c && typeof c.text === "string" && !beforeIds.has(c.id))
    .map((c: RawComment) => ({ text: c.text as string, author: typeof c.author === "string" ? c.author : undefined }));
}

/** @Nome dentro de um comentário — só entre quem já está designado no card, pra não precisar
 * de uma consulta extra ao time todo. */
function extractMentionedNames(text: string, roster: string[]): string[] {
  const lower = text.toLowerCase();
  return roster.filter((name) => name && lower.includes(`@${name.toLowerCase()}`));
}

function notifyNewCommentMentions(
  title: string,
  taskId: string,
  roster: string[],
  before: unknown,
  after: unknown,
  actorId?: string,
) {
  for (const comment of findNewComments(before, after)) {
    const mentioned = extractMentionedNames(comment.text, roster).filter(
      (name) => name.toLowerCase() !== (comment.author ?? "").toLowerCase(),
    );
    if (mentioned.length === 0) continue;
    notifyUsersByName(
      mentioned,
      { title: "Você foi mencionado em um comentário", message: `"${title}": ${comment.text}`, meta: JSON.stringify({ taskId }) },
      actorId,
    ).catch(() => {});
  }
}

export const tasksService = {
  resolveArea: resolveTaskArea,

  async findAll(filters: TaskFilters) {
    return prisma.task.findMany({
      where: buildWhere(filters),
      orderBy: [
        { status: "asc" },
        { position: "asc" },
        { createdAt: "desc" },
      ],
    });
  },

  /** Histórico de quem moveu/mudou o quê, reaproveitando o audit log genérico. */
  async history(id: string) {
    await this.findById(id);
    return auditService.list({ entity: "Task", entityId: id });
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

  async create(payload: TaskPayload, actor?: { id: string; name: string }) {
    const area = resolveTaskArea(payload.area);
    const defaultStatus = area === "marketing" ? "ideas" : "todo";
    const status = payload.status ?? defaultStatus;
    const data = buildData(
      {
        area,
        status,
        priority: "media",
        ...payload,
      },
      area,
      true,
    ) as Prisma.TaskUncheckedCreateInput;

    if (data.position === undefined) {
      data.position = await endOfColumnPosition(area, status);
    }

    const contentFields = resolveContentFields({ contentFormat: null, contentStep: null }, payload);
    if (contentFields) {
      data.contentFormat = contentFields.contentFormat;
      data.contentStep = contentFields.contentStep;
    }

    const created = await prisma.task.create({
      data,
    });

    void auditService.log({ userId: actor?.id, userName: actor?.name, action: "task.create", entity: "Task", entityId: created.id });

    if (area === "marketing") {
      notifyTaskAssignees(created.title, [], created.assignedTo, actor?.id).catch(() => {});
    }
    return created;
  },

  async update(id: string, payload: TaskPayload, actor?: { id: string; name: string }) {
    const task = await this.findById(id);
    const area = resolveTaskArea(task.area);

    if (payload.area !== undefined && payload.area !== task.area) {
      throw new AppError("Area da tarefa não pode ser alterada", 400);
    }

    const data = buildData(payload, area, false) as Prisma.TaskUncheckedUpdateInput;

    const contentFields = resolveContentFields({ contentFormat: task.contentFormat, contentStep: task.contentStep }, payload);
    const contentStepChanged = contentFields !== undefined && contentFields.contentStep !== task.contentStep;
    if (contentFields) {
      data.contentFormat = contentFields.contentFormat;
      data.contentStep = contentFields.contentStep;
    }

    const statusChanged = payload.status !== undefined && payload.status !== task.status;
    if (statusChanged) {
      data.statusChangedAt = new Date();
      if (payload.position === undefined) {
        data.position = await endOfColumnPosition(area, payload.status as string);
      }
    }

    const updated = await prisma.task.update({
      where: { id },
      data,
    });

    if (statusChanged) {
      void auditService.log({
        userId: actor?.id,
        userName: actor?.name,
        action: "task.move",
        entity: "Task",
        entityId: id,
        meta: { from: task.status, to: updated.status },
      });
    }
    if (payload.dueDate !== undefined) {
      const fromDue = task.dueDate?.toISOString() ?? null;
      const toDue = updated.dueDate?.toISOString() ?? null;
      if (fromDue !== toDue) {
        void auditService.log({
          userId: actor?.id,
          userName: actor?.name,
          action: "task.dueDate",
          entity: "Task",
          entityId: id,
          meta: { from: fromDue, to: toDue },
        });
      }
    }

    if (contentStepChanged) {
      void auditService.log({
        userId: actor?.id,
        userName: actor?.name,
        action: "task.step",
        entity: "Task",
        entityId: id,
        meta: { from: task.contentStep, to: updated.contentStep },
      });
      if (updated.contentFormat) {
        const next = nextContentStep(updated.contentFormat, updated.contentStep ?? "");
        if (next) {
          notifyUsersForStep(
            next,
            {
              title: `Pronto para ${CONTENT_STEP_LABEL[next]}`,
              message: `"${updated.title}" está esperando a etapa de ${CONTENT_STEP_LABEL[next].toLowerCase()}.`,
              meta: JSON.stringify({ taskId: id }),
            },
            actor?.id,
          ).catch(() => {});
        }
      }
    }

    if (area === "marketing" && payload.assignedTo !== undefined) {
      notifyTaskAssignees(updated.title, task.assignedTo, updated.assignedTo, actor?.id).catch(() => {});
    }
    if (payload.comments !== undefined) {
      notifyNewCommentMentions(updated.title, id, updated.assignedTo, task.comments, updated.comments, actor?.id);
    }
    return updated;
  },

  async updateStatus(id: string, status: string, position?: number, actor?: { id: string; name: string }) {
    const task = await this.findById(id);
    const area = resolveTaskArea(task.area);
    validateStatus(status, area);

    const statusChanged = status !== task.status;
    const nextPosition = position ?? (statusChanged ? await endOfColumnPosition(area, status) : task.position);

    const updated = await prisma.task.update({
      where: { id },
      data: {
        status,
        position: nextPosition,
        ...(statusChanged ? { statusChangedAt: new Date() } : {}),
      },
    });

    if (statusChanged) {
      void auditService.log({
        userId: actor?.id,
        userName: actor?.name,
        action: "task.move",
        entity: "Task",
        entityId: id,
        meta: { from: task.status, to: updated.status },
      });
    }

    if (area === "marketing" && status === "review" && task.status !== "review") {
      notifyUsersByRole(
        ["ChefeMarketing"],
        { title: "Card pronto para revisão", message: `"${updated.title}" foi para Revisão.`, meta: JSON.stringify({ taskId: updated.id }) },
        actor?.id,
      ).catch(() => {});
    }
    return updated;
  },

  async delete(id: string) {
    await this.findById(id);
    await prisma.task.delete({
      where: { id },
    });
  },

  async approve(id: string, action: "schedule" | "publish", scheduledAt?: string) {
    const task = await this.findById(id);
    const nextStatus = action === "schedule" ? "scheduled" : "published";
    const position = await endOfColumnPosition("marketing", nextStatus);

    if (action === "schedule") {
      if (!scheduledAt) {
        throw new AppError("scheduledAt é obrigatório para agendamento", 400);
      }
      const date = new Date(scheduledAt);
      if (Number.isNaN(date.getTime())) {
        throw new AppError("scheduledAt inválido", 400);
      }
      const updated = await prisma.task.update({
        where: { id },
        data: { approvalStatus: "approved", status: "scheduled", scheduledAt: date, statusChangedAt: new Date(), position },
      });
      void auditService.log({ action: "task.move", entity: "Task", entityId: id, meta: { from: task.status, to: "scheduled" } });
      return updated;
    }

    const updated = await prisma.task.update({
      where: { id },
      data: { approvalStatus: "approved", status: "published", scheduledAt: null, statusChangedAt: new Date(), position },
    });
    void auditService.log({ action: "task.move", entity: "Task", entityId: id, meta: { from: task.status, to: "published" } });
    return updated;
  },

  async reject(id: string) {
    const task = await this.findById(id);
    const position = await endOfColumnPosition("marketing", "production");
    const updated = await prisma.task.update({
      where: { id },
      data: { approvalStatus: "rejected", status: "production", statusChangedAt: new Date(), position },
    });
    void auditService.log({ action: "task.move", entity: "Task", entityId: id, meta: { from: task.status, to: "production" } });
    return updated;
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
      data: { status: "published", statusChangedAt: now },
    });
  },

  /** Quantas tasks finalizadas (done/published) de uma área já passaram do prazo de retenção. */
  async countFinishedOlderThan(area: TaskArea, cutoff: Date = retentionCutoff()) {
    return prisma.task.count({
      where: { area, status: FINISHED_STATUS_BY_AREA[area], updatedAt: { lt: cutoff } },
    });
  },

  /**
   * Apaga de vez tasks finalizadas (done/published) há mais de TASK_RETENTION_DAYS, pra não
   * acumular lixo no banco. Sem área, limpa as duas. Usado pelo botão "Limpar antigos" e
   * pela limpeza automática diária (tasks-scheduler.ts).
   */
  async deleteFinishedOlderThan(area?: TaskArea, cutoff: Date = retentionCutoff()) {
    const areas = area ? [area] : [...allowedAreas];
    const results = await Promise.all(
      areas.map((current) =>
        prisma.task.deleteMany({
          where: { area: current, status: FINISHED_STATUS_BY_AREA[current], updatedAt: { lt: cutoff } },
        }),
      ),
    );
    return results.reduce((total, result) => total + result.count, 0);
  },
};

function retentionCutoff() {
  return new Date(Date.now() - TASK_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}


