import type { RequestHandler } from "express";
import { AppError } from "../../middlewares/error.middleware";
import { authService } from "./auth.service";

export const authController = {
  login: (async (request, response, next) => {
    try {
      const login = request.body.login ?? request.body.email;
      const { password } = request.body;

      if (!login || !password) {
        throw new AppError("Usuário/e-mail e senha são obrigatórios", 400);
      }

      const result = await authService.login(login, password);
      response.json(result);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  me: (async (request, response, next) => {
    try {
      if (!request.user) {
        throw new AppError("Usuário não autenticado", 401);
      }

      const user = await authService.me(request.user.id);
      response.json(user);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  changePassword: (async (request, response, next) => {
    try {
      if (!request.user) {
        throw new AppError("Usuário não autenticado", 401);
      }

      const { currentPassword, newPassword } = request.body;

      if (!currentPassword || !newPassword) {
        throw new AppError("Senha atual e nova senha são obrigatórias", 400);
      }

      const user = await authService.changePassword(
        request.user.id,
        currentPassword,
        newPassword,
      );
      response.json(user);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,

  changeFirstPassword: (async (request, response, next) => {
    try {
      if (!request.user) {
        throw new AppError("Usuário não autenticado", 401);
      }

      const { newPassword, confirmPassword } = request.body;

      if (!newPassword || !confirmPassword) {
        throw new AppError("Nova senha e confirmação são obrigatórias", 400);
      }

      const user = await authService.changeFirstPassword(
        request.user.id,
        newPassword,
        confirmPassword,
      );
      response.json(user);
    } catch (error) {
      next(error);
    }
  }) satisfies RequestHandler,
};

