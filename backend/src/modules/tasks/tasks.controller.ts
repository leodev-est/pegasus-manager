import type { RequestHandler } from "express";
import { AppError } from "../../middlewares/error.middleware";
import { listTaskHistory, logTaskChanges, logTaskEvent } from "./tasks-history";
import { newComments, notifyMentions } from "./tasks-mentions";
import { mergeIncomingComments, tasksService, type TaskArea } from "./tasks.service";

function getParamId(id: string | string[]) {
  return Array.isArray(id) ? id[0] : id;
}

function getQueryParam(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

type TaskAction = "read" | "create" | "update" | "delete";

const APPROVER_ROLES = ["Diretor", "ChefeMarketing"];

function isApprover(request: Parameters<RequestHandler>[0]) {
  return Boolean(request.user?.roles.some((role) => APPROVER_ROLES.includes(role)));
}

/** Fields that change what gets published; locked on approved (scheduled) cards. */
const CONTENT_FIELDS = ["title", "description", "channel", "format", "labels", "checklist"] as const;

function ensureAreaPermission(request: Parameters<RequestHandler>[0], area: TaskArea, action: TaskAction) {
  const user = request.user;
  const permission = `${area}:${action}`;

  if (!user) {
    throw new AppError("Usuário não autenticado", 401);
  }

  if (user.roles.includes("Diretor") || user.permissions.includes(permission)) {
    return;
  }

  throw new AppError("Permissão insuficiente", 403);
}

export const tasksController = {
  findAll: (async (request, response, next) => {
    try {
      const area = tasksService.resolveArea(getQueryParam(request.query.area));
      ensureAreaPermission(request, area, "read");
      const tasks = await tasksService.findAll({
        area,
        status: getQueryParam(request.query.status),
        assignedTo: getQueryParam(request.query.assignedTo),
        priority: getQueryParam(request.query.priority),
        search: getQueryParam(request.query.search),
        channel: getQueryParam(request.query.channel),
        includeArchived: getQueryParam(request.query.includeArchived) === "true",
      });
      response.json(tasks);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  findById: (async (request, response, next) => {
    try {
      const task = await tasksService.findById(getParamId(request.params.id));
      ensureAreaPermission(request, task.area as TaskArea, "read");
      response.json(task);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  create: (async (request, response, next) => {
    try {
      const area = tasksService.resolveArea(request.body.area);
      ensureAreaPermission(request, area, "create");
      const task = await tasksService.create(request.body);
      logTaskEvent(request, task, "create", { status: task.status });
      response.status(201).json(task);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  update: (async (request, response, next) => {
    try {
      const id = getParamId(request.params.id);
      const currentTask = await tasksService.findById(id);
      ensureAreaPermission(request, currentTask.area as TaskArea, "update");
      const payload = { ...(request.body ?? {}) };

      // An approved, scheduled post goes out as approved: only approvers may change its content.
      if (currentTask.status === "scheduled" && !isApprover(request)) {
        const same = (value: unknown) => JSON.stringify(value === "" || value === undefined ? null : value);
        const changed = CONTENT_FIELDS.filter(
          (field) => payload[field] !== undefined && same(payload[field]) !== same(currentTask[field]),
        );
        if (changed.length > 0) {
          throw new AppError("Card agendado já foi aprovado. Peça a quem aprova para desagendar antes de editar.", 400);
        }
      }

      // Comments can only be added here (never edited, removed or signed by someone else).
      if (payload.comments !== undefined) {
        payload.comments = mergeIncomingComments(currentTask.comments, payload.comments, {
          id: request.user!.id,
          name: request.user!.name,
        });
      }

      const task = await tasksService.update(id, payload);
      logTaskChanges(request, currentTask, task);
      // Comments added through the edit form also notify @mentions.
      const added = newComments(currentTask.comments, task.comments);
      if (added.length > 0) {
        logTaskEvent(request, task, "comment", { count: added.length });
        void notifyMentions(task, added, request.user);
      }
      response.json(task);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  updateStatus: (async (request, response, next) => {
    try {
      const id = getParamId(request.params.id);
      const currentTask = await tasksService.findById(id);
      ensureAreaPermission(request, currentTask.area as TaskArea, "update");
      const task = await tasksService.updateStatus(id, request.body.status);
      logTaskChanges(request, currentTask, task);
      response.json(task);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  archive: (async (request, response, next) => {
    try {
      const id = getParamId(request.params.id);
      const currentTask = await tasksService.findById(id);
      ensureAreaPermission(request, currentTask.area as TaskArea, "update");
      if (typeof request.body?.archived !== "boolean") {
        throw new AppError("Informe archived: true ou false", 400);
      }
      const task = await tasksService.setArchived(id, request.body.archived);
      logTaskEvent(request, task, request.body.archived ? "archive" : "unarchive");
      response.json(task);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  reorder: (async (request, response, next) => {
    try {
      const id = getParamId(request.params.id);
      const currentTask = await tasksService.findById(id);
      ensureAreaPermission(request, currentTask.area as TaskArea, "update");
      const readId = (value: unknown) => (typeof value === "string" && value ? value : null);
      const task = await tasksService.reorder(id, {
        beforeId: readId(request.body?.beforeId),
        afterId: readId(request.body?.afterId),
      });
      response.json(task);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  addComment: (async (request, response, next) => {
    try {
      const id = getParamId(request.params.id);
      const currentTask = await tasksService.findById(id);
      ensureAreaPermission(request, currentTask.area as TaskArea, "update");
      const user = request.user!;
      const text = typeof request.body?.text === "string" ? request.body.text : "";
      const { task, comment } = await tasksService.addComment(id, text, { id: user.id, name: user.name });
      logTaskEvent(request, task, "comment", { count: 1 });
      void notifyMentions(task, [comment], { id: user.id, name: user.name });
      response.status(201).json(task);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  history: (async (request, response, next) => {
    try {
      const id = getParamId(request.params.id);
      const currentTask = await tasksService.findById(id);
      ensureAreaPermission(request, currentTask.area as TaskArea, "read");
      response.json(await listTaskHistory(id));
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  delete: (async (request, response, next) => {
    try {
      const id = getParamId(request.params.id);
      const currentTask = await tasksService.findById(id);
      ensureAreaPermission(request, currentTask.area as TaskArea, "delete");
      await tasksService.delete(id);
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  approve: (async (request, response, next) => {
    try {
      const user = request.user;
      if (!user || (!user.roles.includes("Diretor") && !user.roles.includes("ChefeMarketing"))) {
        next(new AppError("Apenas o responsável de marketing pode aprovar tarefas", 403));
        return;
      }
      const id = getParamId(request.params.id);
      const { action, scheduledAt } = request.body as { action: "schedule" | "publish"; scheduledAt?: string };
      const task = await tasksService.approve(id, action, scheduledAt);
      logTaskEvent(request, task, "approve", {
        to: task.status,
        scheduledAt: task.scheduledAt ? task.scheduledAt.toISOString() : null,
      });
      response.json(task);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  reject: (async (request, response, next) => {
    try {
      const user = request.user;
      if (!user || (!user.roles.includes("Diretor") && !user.roles.includes("ChefeMarketing"))) {
        next(new AppError("Apenas o responsável de marketing pode reprovar ou desagendar tarefas", 403));
        return;
      }
      const id = getParamId(request.params.id);
      const before = await tasksService.findById(id);
      const task = await tasksService.reject(id);
      logTaskEvent(request, task, before.status === "scheduled" ? "unschedule" : "reject", { to: task.status });
      response.json(task);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  publishScheduled: (async (_request, response, next) => {
    try {
      await tasksService.publishScheduled();
      response.json({ ok: true });
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,
};

