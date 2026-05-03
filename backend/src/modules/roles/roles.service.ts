import { prisma } from "../../config/prisma";
import { AppError } from "../../middlewares/error.middleware";

type RolePayload = {
  name?: string;
  description?: string;
  permissions?: string[];
};

const includePermissions = {
  permissions: {
    include: {
      permission: true,
    },
  },
};

function formatRole(role: {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  permissions: Array<{ permission: { key: string; name: string; description: string | null } }>;
}) {
  return {
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: role.permissions.map((rolePermission) => rolePermission.permission),
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
}

async function syncPermissions(roleId: string, permissions?: string[]) {
  if (!permissions) {
    return;
  }

  await prisma.rolePermission.deleteMany({
    where: { roleId },
  });

  for (const permissionKey of permissions) {
    const permission = await prisma.permission.findUnique({
      where: { key: permissionKey },
    });

    if (!permission) {
      throw new AppError(`Permissão ${permissionKey} não encontrada`, 400);
    }

    await prisma.rolePermission.create({
      data: {
        roleId,
        permissionId: permission.id,
      },
    });
  }
}

export const rolesService = {
  async findAll() {
    const roles = await prisma.role.findMany({
      orderBy: { name: "asc" },
      include: includePermissions,
    });

    return roles.map(formatRole);
  },

  async create(payload: RolePayload) {
    if (!payload.name) {
      throw new AppError("Nome da role é obrigatório", 400);
    }

    const role = await prisma.role.create({
      data: {
        name: payload.name,
        description: payload.description,
      },
    });

    await syncPermissions(role.id, payload.permissions);

    const createdRole = await prisma.role.findUniqueOrThrow({
      where: { id: role.id },
      include: includePermissions,
    });

    return formatRole(createdRole);
  },

  async update(id: string, payload: RolePayload) {
    await prisma.role.update({
      where: { id },
      data: {
        name: payload.name,
        description: payload.description,
      },
    });

    await syncPermissions(id, payload.permissions);

    const role = await prisma.role.findUniqueOrThrow({
      where: { id },
      include: includePermissions,
    });

    return formatRole(role);
  },
};


