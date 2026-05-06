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
  Gestao: [
    "management:read",
    "management:create",
    "management:update",
    "management:delete",
    "athletes:read",
    "trainings:read",
  ],
  RH: ["athletes:read", "athletes:create", "athletes:update", "athletes:delete", "management:read"],
  Financeiro: ["finance:read", "finance:create", "finance:update", "finance:delete", "management:read"],
  Marketing: ["marketing:read", "marketing:create", "marketing:update", "marketing:delete", "management:read"],
  ChefeMarketing: ["marketing:read", "marketing:create", "marketing:update", "marketing:delete", "management:read"],
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
  { name: "Leo", username: "leo", roles: ["Diretor", "Gestao", "Atleta"] },
  { name: "Allef", username: "allef", roles: ["Diretor", "Gestao", "Atleta"] },
  { name: "Giulia", username: "giulia", roles: ["RH", "Financeiro", "Gestao", "Atleta"] },
  { name: "Victoria", username: "victoria", roles: ["Conselheiro", "Operacional", "Gestao", "Atleta"] },
  { name: "Vito", username: "vito", roles: ["Marketing", "ChefeMarketing", "Gestao", "Atleta"] },
];

async function main() {
  const tempPassword = process.env.ATHLETE_TEMP_PASSWORD ?? "Pegasus@Temp!2025";
  const password = await bcrypt.hash(tempPassword, 10);

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
    const existingUser = await prisma.user.findUnique({ where: { username: userData.username } });

    let athleteId = existingUser?.athleteId ?? null;

    if (!athleteId) {
      const athlete = await prisma.athlete.create({
        data: { name: userData.name, status: "ativo", monthlyPaymentStatus: "isento" },
      });
      athleteId = athlete.id;
    } else {
      await prisma.athlete.update({
        where: { id: athleteId },
        data: { name: userData.name, status: "ativo" },
      });
    }

    const user = await prisma.user.upsert({
      where: { username: userData.username },
      update: { name: userData.name, active: true, athleteId },
      create: {
        name: userData.name,
        username: userData.username,
        password,
        active: true,
        mustChangePassword: true,
        athleteId,
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

