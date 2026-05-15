import type { RequestHandler } from "express";
import { auditService } from "../audit/audit.service";
import { financeService } from "./finance.service";

function getParamId(id: string | string[]) {
  return Array.isArray(id) ? id[0] : id;
}

function getQueryParam(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

export const financeController = {
  summary: (async (request, response, next) => {
    try {
      const summary = await financeService.getSummary(getQueryParam(request.query.month));
      response.json(summary);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  findPayments: (async (request, response, next) => {
    try {
      const payments = await financeService.findPayments({
        status: getQueryParam(request.query.status),
        type: getQueryParam(request.query.type),
        month: getQueryParam(request.query.month),
        athleteId: getQueryParam(request.query.athleteId),
      });
      response.json(payments);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  createPayment: (async (request, response, next) => {
    try {
      const payment = await financeService.createPayment(request.body);
      response.status(201).json(payment);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  updatePayment: (async (request, response, next) => {
    try {
      const payment = await financeService.updatePayment(getParamId(request.params.id), request.body);
      response.json(payment);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  deletePayment: (async (request, response, next) => {
    try {
      await financeService.deletePayment(getParamId(request.params.id));
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  findMovements: (async (_request, response, next) => {
    try {
      const movements = await financeService.findMovements();
      response.json(movements);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  createMovement: (async (request, response, next) => {
    try {
      const movement = await financeService.createMovement(request.body);
      response.status(201).json(movement);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  updateMovement: (async (request, response, next) => {
    try {
      const movement = await financeService.updateMovement(getParamId(request.params.id), request.body);
      response.json(movement);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  deleteMovement: (async (request, response, next) => {
    try {
      await financeService.deleteMovement(getParamId(request.params.id));
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  chartData: (async (request, response, next) => {
    try {
      const months = Math.min(Number(request.query.months) || 6, 12);
      response.json(await financeService.getChartData(months));
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  getMensalidades: (async (request, response, next) => {
    try {
      const month = getQueryParam(request.query.month) ?? new Date().toISOString().slice(0, 7);
      const status = getQueryParam(request.query.status);
      response.json(await financeService.getMensalidades(month, status));
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  payMensalidade: (async (request, response, next) => {
    try {
      const result = await financeService.payMensalidade(getParamId(request.params.id));
      auditService.log({ userId: request.user?.id, userName: request.user?.name, action: "pay_mensalidade", entity: "Payment", entityId: result.id });
      response.json(result);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  undoMensalidade: (async (request, response, next) => {
    try {
      const result = await financeService.undoMensalidade(getParamId(request.params.id));
      auditService.log({ userId: request.user?.id, userName: request.user?.name, action: "undo_mensalidade", entity: "Payment", entityId: getParamId(request.params.id) });
      response.json(result);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,
};
