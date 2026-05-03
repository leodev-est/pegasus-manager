import bcrypt from "bcrypt";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";

type UserPayload = {
  name?: string;
  username?: string;
  email?: string;
  password?: string;
  active?: boolean;
  mustChangePassword?: boolean;
  roles?: string[];
};

const includeRoles = {
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
};

async function formatUser(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: includeRoles,
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    active: user.active,
    mustChangePassword: user.mustChangePassword,
    roles: user.roles.map((userRole) => userRole.role.name),
    permissions: Array.from(
      new Set(
        user.roles.flatMap((userRole) =>
          userRole.role.permissions.map((rolePermission) => rolePermission.permission.key),
        ),
      ),
    ),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function syncRoles(userId: string, roles?: string[]) {
  if (!roles) {
    return;
  }

  await prisma.userRole.deleteMany({
    where: { userId },
  });

  for (const roleName of roles) {
    const role = await prisma.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      throw new AppError(`Role ${roleName} não encontrada`, 400);
    }

    await prisma.userRole.create({
      data: {
        userId,
        roleId: role.id,
      },
    });
  }
}

export const usersService = {
  async findAll() {
    const users = await prisma.user.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: includeRoles,
    });

    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      active: user.active,
      mustChangePassword: user.mustChangePassword,
      roles: user.roles.map((userRole) => userRole.role.name),
      permissions: Array.from(
        new Set(
          user.roles.flatMap((userRole) =>
            userRole.role.permissions.map((rolePermission) => rolePermission.permission.key),
          ),
        ),
      ),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));
  },

  async create(payload: UserPayload) {
    if (!payload.name || !payload.username || !payload.password) {
      throw new AppError("Nome, usuário e senha são obrigatórios", 400);
    }

    const user = await prisma.user.create({
      data: {
        name: payload.name,
        username: payload.username.trim().toLowerCase(),
        email: payload.email?.trim().toLowerCase() || null,
        password: await bcrypt.hash(payload.password, 10),
        active: payload.active ?? true,
        mustChangePassword: payload.mustChangePassword ?? false,
      },
    });

    await syncRoles(user.id, payload.roles);
    return formatUser(user.id);
  },

  async update(id: string, payload: UserPayload) {
    const data: {
      name?: string;
      username?: string;
      email?: string;
      password?: string;
      active?: boolean;
      mustChangePassword?: boolean;
    } = {};

    if (payload.name !== undefined) data.name = payload.name;
    if (payload.username !== undefined) data.username = payload.username.trim().toLowerCase();
    if (payload.email !== undefined) data.email = payload.email?.trim().toLowerCase() || undefined;
    if (payload.active !== undefined) data.active = payload.active;
    if (payload.mustChangePassword !== undefined) {
      data.mustChangePassword = payload.mustChangePassword;
    }
    if (payload.password) data.password = await bcrypt.hash(payload.password, 10);

    await prisma.user.update({
      where: { id },
      data,
    });

    await syncRoles(id, payload.roles);
    return formatUser(id);
  },

  async updateRoles(id: string, roles: string[]) {
    await syncRoles(id, roles);
    return formatUser(id);
  },

  async softDelete(id: string) {
    await prisma.user.update({
      where: { id },
      data: {
        active: false,
      },
    });

    return formatUser(id);
  },
};

