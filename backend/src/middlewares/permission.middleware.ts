import type { RequestHandler } from "express";
import { AppError } from "./error.middleware";

export function permissionMiddleware(permissionKey: string): RequestHandler {
  return (request, _response, next) => {
    const user = request.user;

    if (!user) {
      next(new AppError("Usuário não autenticado", 401));
      return;
    }

    if (user.roles.includes("Diretor") || user.permissions.includes(permissionKey)) {
      next();
      return;
    }

    next(new AppError("Permissão insuficiente", 403));
  };
}

