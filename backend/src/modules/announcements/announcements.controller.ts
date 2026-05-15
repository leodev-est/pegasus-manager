import type { RequestHandler } from "express";
import { announcementsService } from "./announcements.service";

function getParamId(id: string | string[]) {
  return Array.isArray(id) ? id[0] : id;
}

export const announcementsController = {
  listTemplates: (async (_req, res, next) => {
    try { res.json(await announcementsService.listTemplates()); } catch (e) { next(e); }
  }) satisfies RequestHandler,

  createTemplate: (async (req, res, next) => {
    try { res.status(201).json(await announcementsService.createTemplate(req.body)); } catch (e) { next(e); }
  }) satisfies RequestHandler,

  updateTemplate: (async (req, res, next) => {
    try { res.json(await announcementsService.updateTemplate(getParamId(req.params.id), req.body)); } catch (e) { next(e); }
  }) satisfies RequestHandler,

  deleteTemplate: (async (req, res, next) => {
    try { await announcementsService.deleteTemplate(getParamId(req.params.id)); res.status(204).send(); } catch (e) { next(e); }
  }) satisfies RequestHandler,

  listScheduled: (async (_req, res, next) => {
    try { res.json(await announcementsService.listScheduled()); } catch (e) { next(e); }
  }) satisfies RequestHandler,

  createScheduled: (async (req, res, next) => {
    try { res.status(201).json(await announcementsService.createScheduled(req.body)); } catch (e) { next(e); }
  }) satisfies RequestHandler,

  cancelScheduled: (async (req, res, next) => {
    try { res.json(await announcementsService.cancelScheduled(getParamId(req.params.id))); } catch (e) { next(e); }
  }) satisfies RequestHandler,
};
