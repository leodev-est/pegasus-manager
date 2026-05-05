import type { RequestHandler } from "express";
import { AppError } from "./error.middleware";

export function permissionMiddleware(permissionKey: string | string[]): RequestHandler {
  return (request, _response, next) => {
    const user = request.user;

    if (!user) {
      next(new AppError("Usuário não autenticado", 401));
      return;
    }

    const keys = Array.isArray(permissionKey) ? permissionKey : [permissionKey];

    if (user.roles.includes("Diretor") || keys.some((key) => user.permissions.includes(key))) {
      next();
      return;
    }

    next(new AppError("Permissão insuficiente", 403));
  };
}

