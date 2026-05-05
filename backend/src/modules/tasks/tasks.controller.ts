import type { RequestHandler } from "express";
import { AppError } from "../../middlewares/error.middleware";
import { tasksService, type TaskArea } from "./tasks.service";

function getParamId(id: string | string[]) {
  return Array.isArray(id) ? id[0] : id;
}

function getQueryParam(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

type TaskAction = "read" | "create" | "update" | "delete";

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
      const task = await tasksService.update(id, request.body);
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
      response.json(task);
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
      if (!user || (!user.roles.includes("Diretor") && !user.roles.includes("MarketingLvl2"))) {
        next(new AppError("Apenas o responsável de marketing pode aprovar tarefas", 403));
        return;
      }
      const id = getParamId(request.params.id);
      const { action, scheduledAt } = request.body as { action: "schedule" | "publish"; scheduledAt?: string };
      const task = await tasksService.approve(id, action, scheduledAt);
      response.json(task);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  reject: (async (request, response, next) => {
    try {
      const user = request.user;
      if (!user || (!user.roles.includes("Diretor") && !user.roles.includes("MarketingLvl2"))) {
        next(new AppError("Apenas o responsável de marketing pode reprovar tarefas", 403));
        return;
      }
      const id = getParamId(request.params.id);
      const task = await tasksService.reject(id);
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

