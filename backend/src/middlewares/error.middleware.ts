import type { ErrorRequestHandler } from "express";

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const errorMiddleware: ErrorRequestHandler = (error, _request, response, _next) => {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const isProduction = process.env.NODE_ENV === "production";
  const message =
    error instanceof AppError || !isProduction
      ? error instanceof Error
        ? error.message
        : "Erro interno do servidor"
      : "Erro interno do servidor";

  response.status(statusCode).json({
    message,
  });
};
