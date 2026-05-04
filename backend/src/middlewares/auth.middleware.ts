import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma";
import { AppError } from "./error.middleware";
import { getJwtSecret } from "../utils/jwt";
import type { JwtPayload } from "../types/auth";

export const authMiddleware: RequestHandler = async (request, _response, next) => {
  try {
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      throw new AppError("Token não informado", 401);
    }

    const token = authorization.replace("Bearer ", "");
    const payload = jwt.verify(token, getJwtSecret()) as JwtPayload;

    const user = await prisma.user.findFirst({
      where: {
        id: payload.sub,
        active: true,
      },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AppError("Usuário não encontrado ou inativo", 401);
    }

    request.user = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      roles: user.roles.map((userRole) => userRole.role.name),
      permissions: Array.from(
        new Set(
          user.roles.flatMap((userRole) =>
            userRole.role.permissions.map((rolePermission) => rolePermission.permission.key),
          ),
        ),
      ),
    };

    next();
  } catch (error) {
    next(error instanceof AppError ? error : new AppError("Token inválido", 401));
  }
};


