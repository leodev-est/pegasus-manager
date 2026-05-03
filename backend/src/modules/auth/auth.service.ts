import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";

type UserWithRoles = Awaited<ReturnType<typeof findUserByEmail>>;

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new AppError("JWT_SECRET não configurado", 500);
  }

  return secret;
}

function buildUserResponse(user: NonNullable<UserWithRoles>) {
  const roles = user.roles.map((userRole) => userRole.role.name);
  const permissions = Array.from(
    new Set(
      user.roles.flatMap((userRole) =>
        userRole.role.permissions.map((rolePermission) => rolePermission.permission.key),
      ),
    ),
  );

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    active: user.active,
    mustChangePassword: user.mustChangePassword,
    roles,
    permissions,
  };
}

function findUserByEmail(email: string) {
  return prisma.user.findFirst({
    where: {
      OR: [{ email }, { username: email }],
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
}

function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
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
}

export const authService = {
  async login(login: string, password: string) {
    const normalizedLogin = login.trim().toLowerCase();
    const user = await findUserByEmail(normalizedLogin);

    if (!user || !user.active) {
      throw new AppError("E-mail ou senha inválidos", 401);
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      throw new AppError("E-mail ou senha inválidos", 401);
    }

    const token = jwt.sign(
      {
        email: user.email,
      },
      getJwtSecret(),
      {
        expiresIn: "7d",
        subject: user.id,
      },
    );

    return {
      token,
      user: buildUserResponse(user),
    };
  },

  async me(userId: string) {
    const user = await findUserById(userId);

    if (!user || !user.active) {
      throw new AppError("Usuário não encontrado", 404);
    }

    return buildUserResponse(user);
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    if (newPassword.length < 6) {
      throw new AppError("A nova senha deve ter pelo menos 6 caracteres", 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.active) {
      throw new AppError("Usuário não encontrado", 404);
    }

    const passwordMatches = await bcrypt.compare(currentPassword, user.password);

    if (!passwordMatches) {
      throw new AppError("Senha atual inválida", 401);
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        mustChangePassword: false,
        password: await bcrypt.hash(newPassword, 10),
      },
    });

    const updatedUser = await findUserById(userId);

    if (!updatedUser) {
      throw new AppError("Usuário não encontrado", 404);
    }

    return buildUserResponse(updatedUser);
  },

  async changeFirstPassword(userId: string, newPassword: string, confirmPassword: string) {
    if (newPassword !== confirmPassword) {
      throw new AppError("As senhas não conferem", 400);
    }

    if (newPassword.length < 6) {
      throw new AppError("A nova senha deve ter pelo menos 6 caracteres", 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.active) {
      throw new AppError("Usuário não encontrado", 404);
    }

    if (!user.mustChangePassword) {
      throw new AppError("Este usuário não precisa trocar a senha de primeiro acesso", 400);
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        mustChangePassword: false,
        password: await bcrypt.hash(newPassword, 10),
      },
    });

    const updatedUser = await findUserById(userId);

    if (!updatedUser) {
      throw new AppError("Usuário não encontrado", 404);
    }

    return buildUserResponse(updatedUser);
  },
};


