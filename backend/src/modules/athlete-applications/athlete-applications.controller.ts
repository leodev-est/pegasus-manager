import type { RequestHandler } from "express";
import { athleteApplicationsImportService } from "./athlete-applications-import.service";
import { athleteApplicationsService } from "./athlete-applications.service";

function getParamId(id: string | string[]) {
  return Array.isArray(id) ? id[0] : id;
}

function getQueryParam(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

export const athleteApplicationsController = {
  findAll: (async (request, response, next) => {
    try {
      const applications = await athleteApplicationsService.findAll({
        search: getQueryParam(request.query.search),
        status: getQueryParam(request.query.status),
        position: getQueryParam(request.query.position),
      });
      response.json(applications);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  findById: (async (request, response, next) => {
    try {
      const application = await athleteApplicationsService.findById(
        getParamId(request.params.id),
      );
      response.json(application);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  create: (async (request, response, next) => {
    try {
      const application = await athleteApplicationsService.create(request.body);
      response.status(201).json(application);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  publicCreate: (async (request, response, next) => {
    try {
      const application = await athleteApplicationsService.create({
        ...request.body,
        source: "form_publico",
        status: "pendente",
      });
      response.status(201).json(application);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  importFromGoogleSheets: (async (_request, response, next) => {
    try {
      const result = await athleteApplicationsImportService.importFromGoogleSheets();
      response.json(result);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  update: (async (request, response, next) => {
    try {
      const application = await athleteApplicationsService.update(
        getParamId(request.params.id),
        request.body,
      );
      response.json(application);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  approve: (async (request, response, next) => {
    try {
      const result = await athleteApplicationsService.approve(getParamId(request.params.id));
      response.json(result);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  delete: (async (request, response, next) => {
    try {
      await athleteApplicationsService.delete(getParamId(request.params.id));
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,
};
