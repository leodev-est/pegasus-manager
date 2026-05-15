import type { RequestHandler } from "express";
import { auditService } from "../audit/audit.service";
import { athletesImportService } from "./athletes-import.service";
import { athletesService } from "./athletes.service";

function getParamId(id: string | string[]) {
  return Array.isArray(id) ? id[0] : id;
}

function getQueryParam(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

export const athletesController = {
  findAll: (async (request, response, next) => {
    try {
      const athletes = await athletesService.findAll({
        search: getQueryParam(request.query.search),
        status: getQueryParam(request.query.status),
        category: getQueryParam(request.query.category),
        monthlyPaymentStatus: getQueryParam(request.query.monthlyPaymentStatus),
      });

      response.json(athletes);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  findById: (async (request, response, next) => {
    try {
      const athlete = await athletesService.findById(getParamId(request.params.id));
      response.json(athlete);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  create: (async (request, response, next) => {
    try {
      const athlete = await athletesService.create(request.body);
      auditService.log({ userId: request.user?.id, userName: request.user?.name, action: "create", entity: "Athlete", entityId: athlete.id, meta: { name: athlete.name, status: athlete.status } });
      response.status(201).json(athlete);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  importFromGoogleSheets: (async (_request, response, next) => {
    try {
      const result = await athletesImportService.importFromGoogleSheets();
      response.json(result);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  update: (async (request, response, next) => {
    try {
      const athlete = await athletesService.update(getParamId(request.params.id), request.body);
      auditService.log({ userId: request.user?.id, userName: request.user?.name, action: "update", entity: "Athlete", entityId: athlete.id, meta: { name: athlete.name, changes: request.body } });
      response.json(athlete);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  softDelete: (async (request, response, next) => {
    try {
      const athlete = await athletesService.softDelete(getParamId(request.params.id));
      auditService.log({ userId: request.user?.id, userName: request.user?.name, action: "deactivate", entity: "Athlete", entityId: athlete.id, meta: { name: athlete.name } });
      response.json(athlete);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  updatePaymentStatus: (async (request, response, next) => {
    try {
      const { status, notes } = request.body as { status: string; notes?: string };
      const result = await athletesService.updatePaymentStatus(
        getParamId(request.params.id),
        status,
        request.user!.name,
        notes,
      );
      response.json(result);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  getPaymentStatusHistory: (async (request, response, next) => {
    try {
      const history = await athletesService.getPaymentStatusHistory(getParamId(request.params.id));
      response.json(history);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,
};
