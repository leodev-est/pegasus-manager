import type { RequestHandler } from "express";
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
      response.json(athlete);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  softDelete: (async (request, response, next) => {
    try {
      const athlete = await athletesService.softDelete(getParamId(request.params.id));
      response.json(athlete);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,
};
