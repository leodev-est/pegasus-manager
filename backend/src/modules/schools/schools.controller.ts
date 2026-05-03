import type { RequestHandler } from "express";
import { schoolContactsService } from "./school-contacts.service";
import { schoolsService } from "./schools.service";

function getParamId(id: string | string[]) {
  return Array.isArray(id) ? id[0] : id;
}

function getQueryParam(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

export const schoolsController = {
  findContacts: (async (_request, response, next) => {
    try {
      response.json(await schoolContactsService.findAll());
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  findAll: (async (request, response, next) => {
    try {
      const schools = await schoolsService.findAll({
        search: getQueryParam(request.query.search),
        region: getQueryParam(request.query.region),
        status: getQueryParam(request.query.status),
        responsible: getQueryParam(request.query.responsible),
      });
      response.json(schools);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  findById: (async (request, response, next) => {
    try {
      const school = await schoolsService.findById(getParamId(request.params.id));
      response.json(school);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  create: (async (request, response, next) => {
    try {
      const school = await schoolsService.create(request.body);
      response.status(201).json(school);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  update: (async (request, response, next) => {
    try {
      const school = await schoolsService.update(getParamId(request.params.id), request.body);
      response.json(school);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  delete: (async (request, response, next) => {
    try {
      await schoolsService.delete(getParamId(request.params.id));
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,
};
