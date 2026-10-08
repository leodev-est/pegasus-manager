import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const permissions = [
  "users:read",
  "users:create",
  "users:update",
  "users:delete",
  "roles:read",
  "roles:create",
  "roles:update",
  "roles:delete",
  "permissions:read",
  "athletes:read",
  "athletes:create",
  "athletes:update",
  "athletes:delete",
  "finance:read",
  "finance:create",
  "finance:update",
  "finance:delete",
  "management:read",
  "management:create",
  "management:update",
  "management:delete",
  "marketing:read",
  "marketing:create",
  "marketing:update",
  "marketing:delete",
  "trainings:read",
  "trainings:create",
  "trainings:update",
  "trainings:delete",
  "operational:read",
  "operational:create",
  "operational:update",
  "operational:delete",
  "profile:read",
  "profile:update",
];

const rolePermissions: Record<string, string[]> = {
  Diretor: permissions,
  Gestao: [
    "management:read",
    "management:create",
    "management:update",
    "management:delete",
    "athletes:read",
    "trainings:read",
    "operational:read",
    "operational:create",
    "operational:update",
    "operational:delete",
  ],
  RH: ["athletes:read", "athletes:create", "athletes:update", "athletes:delete", "management:read", "marketing:read"],
  Financeiro: ["finance:read", "finance:create", "finance:update", "finance:delete", "management:read"],
  Marketing: ["marketing:read", "marketing:create", "marketing:update", "marketing:delete", "management:read"],
  ChefeMarketing: ["marketing:read", "marketing:create", "marketing:update", "marketing:delete", "management:read"],
  Gestor: [
    "management:read",
    "management:create",
    "management:update",
    "management:delete",
    "athletes:read",
    "trainings:read",
    "operational:read",
    "operational:create",
    "operational:update",
    "operational:delete",
  ],
  Tecnico: ["trainings:read", "trainings:create", "trainings:update", "trainings:delete"],
  Treinador: ["trainings:read", "trainings:create", "trainings:update", "trainings:delete"],
  Operacional: [
    "management:read",
    "management:create",
    "management:update",
    "management:delete",
    "athletes:read",
    "trainings:read",
    "operational:read",
    "operational:create",
    "operational:update",
    "operational:delete",
  ],
  Atleta: ["trainings:read", "profile:read", "profile:update"],
};

async function main() {
  for (const key of permissions) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: {
        key,
        name: key,
        description: `Permissão ${key}`,
      },
    });
  }

  for (const [roleName, permissionKeys] of Object.entries(rolePermissions)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {
        description: `Perfil ${roleName}`,
      },
      create: {
        name: roleName,
        description: `Perfil ${roleName}`,
      },
    });

    for (const permissionKey of permissionKeys) {
      const permission = await prisma.permission.findUniqueOrThrow({
        where: { key: permissionKey },
      });

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }

}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

