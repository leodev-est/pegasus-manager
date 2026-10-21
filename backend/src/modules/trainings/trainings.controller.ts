import type { RequestHandler } from "express";
import { trainingsService } from "./trainings.service";

function getParamId(id: string | string[]) {
  return Array.isArray(id) ? id[0] : id;
}

function getQueryParam(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

export const trainingsController = {
  findAll: (async (request, response, next) => {
    try {
      const trainings = await trainingsService.findAll({
        category: getQueryParam(request.query.category),
        month: getQueryParam(request.query.month),
        search: getQueryParam(request.query.search),
      });
      response.json(trainings);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  findById: (async (request, response, next) => {
    try {
      const training = await trainingsService.findById(getParamId(request.params.id));
      response.json(training);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  create: (async (request, response, next) => {
    try {
      const training = await trainingsService.create(request.body);
      response.status(201).json(training);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  update: (async (request, response, next) => {
    try {
      const training = await trainingsService.update(getParamId(request.params.id), request.body);
      response.json(training);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  delete: (async (request, response, next) => {
    try {
      await trainingsService.delete(getParamId(request.params.id));
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  downloadPdf: (async (request, response, next) => {
    try {
      const { buffer, fileName } = await trainingsService.generatePdf(getParamId(request.params.id));
      // Cabeçalho HTTP não aceita caracteres fora do ASCII (o "—" de "Treino Oficial — Feminino"
      // derrubava a resposta): manda um nome ASCII de reserva + o nome real codificado (RFC 5987).
      const asciiName = fileName
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^\x20-\x7e]/g, "-")
        .replace(/"/g, "");
      response.setHeader("Content-Type", "application/pdf");
      response.setHeader(
        "Content-Disposition",
        `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      );
      response.setHeader("Content-Length", buffer.length);
      response.end(buffer);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,
};
