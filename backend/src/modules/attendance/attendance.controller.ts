import type { RequestHandler } from "express";
import { attendanceService } from "./attendance.service";

function getParamId(id: string | string[]) {
  return Array.isArray(id) ? id[0] : id;
}

function getQueryParam(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

export const attendanceController = {
  todayCheckIn: (async (request, response, next) => {
    try {
      const data = await attendanceService.getTodayCheckIn(request.user!.id);
      response.json(data);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  checkIn: (async (request, response, next) => {
    try {
      const attendance = await attendanceService.checkIn(request.user!.id, request.body.trainingId);
      response.status(201).json(attendance);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  myFrequency: (async (request, response, next) => {
    try {
      const data = await attendanceService.getMyFrequency(request.user!.id, {
        month: getQueryParam(request.query.month),
        year: getQueryParam(request.query.year),
      });
      response.json(data);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  frequency: (async (request, response, next) => {
    try {
      const data = await attendanceService.getFrequency({
        athleteId: getQueryParam(request.query.athleteId),
        month: getQueryParam(request.query.month),
        year: getQueryParam(request.query.year),
      });
      response.json(data);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  update: (async (request, response, next) => {
    try {
      const data = await attendanceService.updateAttendance(getParamId(request.params.id), request.body);
      response.json(data);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,
};
