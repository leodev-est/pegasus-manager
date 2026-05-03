import type { RequestHandler } from "express";
import { evaluationsService } from "./evaluations.service";

function getParamId(id: string | string[]) {
  return Array.isArray(id) ? id[0] : id;
}

export const evaluationsController = {
  getMe: (async (request, response, next) => {
    try {
      response.json(await evaluationsService.getMyEvaluation(request.user!.id));
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  updateSelf: (async (request, response, next) => {
    try {
      response.json(await evaluationsService.updateSelfEvaluation(request.user!.id, request.body));
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  getByAthlete: (async (request, response, next) => {
    try {
      response.json(await evaluationsService.getEvaluation(getParamId(request.params.athleteId)));
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  updateByAthlete: (async (request, response, next) => {
    try {
      response.json(
        await evaluationsService.updateCoachEvaluation(getParamId(request.params.athleteId), request.body),
      );
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,
};
