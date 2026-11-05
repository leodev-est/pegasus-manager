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

// Marketing: Agendado/Publicado só se alcança pelo fluxo de aprovação (approve/publishScheduled).
const APPROVAL_ONLY_STATUSES = ["scheduled", "published"];
const MAX_NEW_COMMENTS_PER_EDIT = 10;
const MAX_COMMENT_LENGTH = 2000;

type RawComment = { id?: unknown; text?: unknown; author?: unknown };

/** Campos que mudam o que vai ao ar: travados num card já aprovado e agendado (o checklist é da produção). */
const SCHEDULED_CONTENT_FIELDS = ["title", "description", "channel", "contentFormat", "labels", "links"] as const;

/**
 * Card agendado já foi aprovado e sai sozinho na hora marcada: só quem aprova pode mudar o
 * conteúdo dele, senão o post sai diferente do que foi aprovado. Compara do jeito que o
 * servidor grava (texto aparado, "" = vazio, links normalizados), então reenviar o formulário
 * sem mudança continua valendo.
 */
function ensureScheduledContentLocked(current: Record<string, unknown> & { status: string }, payload: TaskPayload) {
  if (current.status !== "scheduled") return;
  const incoming = payload as Record<string, unknown>;
  const same = (field: string, value: unknown) => {
    let normalized = typeof value === "string" ? value.trim() : value;
    if (normalized === "" || normalized === undefined) normalized = null;
    if (field === "links") normalized = normalizeLinks(normalized ?? []);
    return JSON.stringify(normalized);
  };
  const changed = SCHEDULED_CONTENT_FIELDS.some(
    (field) => incoming[field] !== undefined && same(field, incoming[field]) !== same(field, current[field]),
  );
  if (changed) {
    throw new AppError("Card agendado já foi aprovado. Peça a quem aprova para desagendar antes de editar.", 400);
  }
}

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

/** Toda peça de marketing passa pela Revisão: ninguém cria, edita ou move direto pra Agendado/Publicado. */
function ensureNotSkippingApproval(area: TaskArea, nextStatus: string | undefined, currentStatus?: string) {
  if (area !== "marketing" || !nextStatus || nextStatus === currentStatus) return;
  if (APPROVAL_ONLY_STATUSES.includes(nextStatus)) {
    throw new AppError("Esse card precisa ser aprovado na Revisão antes de ser agendado ou publicado", 400);
  }
  if (currentStatus === "scheduled") {
    throw new AppError("Card agendado só sai da coluna ao ser publicado ou desagendado", 400);
  }
}

/**
 * Comentários pela edição só podem ser ACRESCENTADOS: os que já existem ficam exatamente como
 * estão no banco (ninguém apaga, edita ou assina pelo outro) e os novos são montados aqui, com o
 * autor vindo do login.
 */
function mergeIncomingComments(stored: unknown, incoming: unknown, actor?: { id: string; name: string }) {
  if (!Array.isArray(incoming)) throw new AppError("Comentários deve ser uma lista", 400);
  const existing = Array.isArray(stored) ? (stored as RawComment[]) : [];
  // Só ids de verdade contam como "já existe": comentário sem id é sempre novo.
  const knownIds = new Set(
    existing.map((comment) => comment?.id).filter((id): id is string => typeof id === "string" && id.length > 0),
  );
  const added = (incoming as RawComment[])
    .filter((comment) => comment && !(typeof comment.id === "string" && knownIds.has(comment.id)))
    .map((comment) => (typeof comment.text === "string" ? comment.text.trim() : ""))
    .filter(Boolean);

  if (added.length > MAX_NEW_COMMENTS_PER_EDIT) throw new AppError("Comentários demais de uma vez", 400);
  if (added.some((text) => text.length > MAX_COMMENT_LENGTH)) {
    throw new AppError(`Comentário deve ter até ${MAX_COMMENT_LENGTH} caracteres`, 400);
  }

  const now = new Date().toISOString();
  return [
    ...existing,
    ...added.map((text, index) => ({
      id: `comment-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
      text,
      author: actor?.name ?? "Pegasus",
      authorId: actor?.id ?? null,
      createdAt: now,
    })),
  ];
}

/**
 * Muda o status só se o card ainda estiver no status que foi checado. Sem isso, uma ação que
 * chega atrasada (ex.: aprovar um card que acabou de ser reprovado) passaria por cima da mais
 * nova. Devolve o card atualizado ou responde 409.
 */
async function updateIfStatusUnchanged(id: string, expectedStatus: string, data: Prisma.TaskUncheckedUpdateManyInput) {
  const { count } = await prisma.task.updateMany({ where: { id, status: expectedStatus }, data });
  if (count === 0) {
    throw new AppError("O card mudou de coluna enquanto isso. Atualize e tente de novo.", 409);
  }
  return prisma.task.findUniqueOrThrow({ where: { id } });
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
    ensureNotSkippingApproval(area, status);
    if (payload.comments !== undefined) {
      data.comments = mergeIncomingComments([], payload.comments, actor) as unknown as Prisma.InputJsonValue;
    }

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

  async update(
    id: string,
    payload: TaskPayload,
    actor?: { id: string; name: string },
    options: { canEditScheduledContent?: boolean; attempt?: number } = {},
  ): Promise<Awaited<ReturnType<typeof prisma.task.findUniqueOrThrow>>> {
    const task = await this.findById(id);
    const area = resolveTaskArea(task.area);
    if (!options.canEditScheduledContent) ensureScheduledContentLocked(task, payload);

    if (payload.area !== undefined && payload.area !== task.area) {
      throw new AppError("Area da tarefa não pode ser alterada", 400);
    }

    // Reenviar o mesmo prazo (mesmo que já passado) não é mudança: não pode barrar a edição
    // de um card atrasado com "o prazo não pode ser anterior a hoje".
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
    if (payload.comments !== undefined) {
      data.comments = mergeIncomingComments(task.comments, payload.comments, actor) as unknown as Prisma.InputJsonValue;
    }

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

    // Grava só se o card não mudou desde que foi lido: assim uma edição não passa por cima de
    // uma aprovação feita no mesmo instante, nem de um comentário salvo por outra pessoa.
    const { count } = await prisma.task.updateMany({
      where: { id, updatedAt: task.updatedAt },
      data: data as Prisma.TaskUncheckedUpdateManyInput,
    });
    if (count === 0) {
      // Outra gravação entrou no meio (ex.: dois cliques rápidos no checklist): refaz tudo sobre
      // o card atualizado — trava do agendado e junção de comentários incluídas.
      const attempt = options.attempt ?? 0;
      if (attempt < 2) return this.update(id, payload, actor, { ...options, attempt: attempt + 1 });
      throw new AppError("O card mudou enquanto você editava. Atualize e tente de novo.", 409);
    }
    const updated = await this.findById(id);

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
    ensureNotSkippingApproval(area, status, task.status);

    const statusChanged = status !== task.status;
    const nextPosition = position ?? (statusChanged ? await endOfColumnPosition(area, status) : task.position);

    const updated = await updateIfStatusUnchanged(id, task.status, {
      status,
      position: nextPosition,
      ...(statusChanged ? { statusChangedAt: new Date() } : {}),
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

  async approve(id: string, action: "schedule" | "publish", scheduledAt?: string, actor?: { id: string; name: string }) {
    const task = await this.findById(id);
    // Aprova-se o que está na Revisão; "Publicar agora" também vale pra um card já agendado.
    const allowedFrom = action === "publish" ? ["review", "scheduled"] : ["review"];
    if (task.area !== "marketing" || !allowedFrom.includes(task.status)) {
      throw new AppError("Só cards em Revisão podem ser aprovados", 400);
    }
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
      if (date.getTime() <= Date.now()) {
        throw new AppError("Escolha uma data e hora no futuro para agendar", 400);
      }
      const updated = await updateIfStatusUnchanged(id, task.status, {
        approvalStatus: "approved",
        status: "scheduled",
        scheduledAt: date,
        statusChangedAt: new Date(),
        position,
      });
      void auditService.log({
        userId: actor?.id,
        userName: actor?.name,
        action: "task.move",
        entity: "Task",
        entityId: id,
        meta: { from: task.status, to: "scheduled" },
      });
      return updated;
    }

    const updated = await updateIfStatusUnchanged(id, task.status, {
      approvalStatus: "approved",
      status: "published",
      scheduledAt: null,
      statusChangedAt: new Date(),
      position,
    });
    void auditService.log({
      userId: actor?.id,
      userName: actor?.name,
      action: "task.move",
      entity: "Task",
      entityId: id,
      meta: { from: task.status, to: "published" },
    });
    return updated;
  },

  /** Reprovar (da Revisão) ou desagendar (de Agendado): o card volta pra Produção. */
  async reject(id: string, actor?: { id: string; name: string }) {
    const task = await this.findById(id);
    if (task.area !== "marketing" || (task.status !== "review" && task.status !== "scheduled")) {
      throw new AppError("Só cards em Revisão ou Agendado podem voltar para Produção", 400);
    }
    const position = await endOfColumnPosition("marketing", "production");
    const updated = await updateIfStatusUnchanged(id, task.status, {
      approvalStatus: "rejected",
      status: "production",
      scheduledAt: null,
      statusChangedAt: new Date(),
      position,
    });
    void auditService.log({
      userId: actor?.id,
      userName: actor?.name,
      action: "task.move",
      entity: "Task",
      entityId: id,
      meta: { from: task.status, to: "production" },
    });
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

  /**
   * Quantas tasks finalizadas (done/published) de uma área estão nessa coluna há mais que o
   * prazo de retenção. Conta a partir de quando o card chegou lá (statusChangedAt), não da
   * última edição: reordenar ou comentar num card antigo não reinicia o prazo.
   */
  async countFinishedOlderThan(area: TaskArea, cutoff: Date = retentionCutoff()) {
    return prisma.task.count({
      where: { area, status: FINISHED_STATUS_BY_AREA[area], statusChangedAt: { lt: cutoff } },
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
          where: { area: current, status: FINISHED_STATUS_BY_AREA[current], statusChangedAt: { lt: cutoff } },
        }),
      ),
    );
    return results.reduce((total, result) => total + result.count, 0);
  },
};

function retentionCutoff() {
  return new Date(Date.now() - TASK_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}


