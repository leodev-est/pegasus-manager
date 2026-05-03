import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

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
  RH: ["athletes:read", "athletes:create", "athletes:update", "athletes:delete", "management:read"],
  Financeiro: ["finance:read", "finance:create", "finance:update", "finance:delete", "management:read"],
  Marketing: ["marketing:read", "marketing:create", "marketing:update", "marketing:delete", "management:read"],
  Conselheiro: ["management:read"],
  Tecnico: ["trainings:read", "trainings:create", "trainings:update", "trainings:delete"],
  Treinador: ["trainings:read", "trainings:create", "trainings:update", "trainings:delete"],
  Operacional: [
    "operational:read",
    "operational:create",
    "operational:update",
    "operational:delete",
    "management:read",
  ],
  Atleta: ["trainings:read", "profile:read", "profile:update"],
};

const users = [
  { name: "Leo", username: "leo", email: "leo@pegasus.com", roles: ["Diretor"] },
  { name: "Allef", username: "allef", email: "allef@pegasus.com", roles: ["Diretor"] },
  { name: "Giulia", username: "giulia", email: "giulia@pegasus.com", roles: ["RH", "Financeiro"] },
  { name: "Victoria", username: "victoria", email: "victoria@pegasus.com", roles: ["Conselheiro", "Operacional"] },
  { name: "Vito", username: "vito", email: "vito@pegasus.com", roles: ["Marketing"] },
];

async function main() {
  const password = await bcrypt.hash("123456", 10);

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

  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        name: userData.name,
        username: userData.username,
        active: true,
      },
      create: {
        name: userData.name,
        username: userData.username,
        email: userData.email,
        password,
        active: true,
      },
    });

    for (const roleName of userData.roles) {
      const role = await prisma.role.findUniqueOrThrow({
        where: { name: roleName },
      });

      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: role.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          roleId: role.id,
        },
      });
    }
  }

  await prisma.user.updateMany({
    where: {
      email: {
        in: ["rafa@pegasus.com", "carol@pegasus.com", "bia@pegasus.com", "nina@pegasus.com"],
      },
    },
    data: {
      active: false,
    },
  });
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

