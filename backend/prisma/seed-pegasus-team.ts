import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const users = [
  { name: "Leo", username: "leo", roles: ["Diretor", "Gestao", "Atleta"] },
  { name: "Allef", username: "allef", roles: ["Diretor", "Gestao", "Atleta"] },
  { name: "Giulia", username: "giulia", roles: ["RH", "Financeiro", "Marketing", "Gestao", "Atleta"] },
  { name: "Victoria", username: "victoria", roles: ["Gestor", "Operacional", "Gestao", "Atleta"] },
  { name: "Vito", username: "vito", roles: ["Marketing", "ChefeMarketing", "Gestao", "Atleta"] },
];

async function main() {
  const tempPassword = process.env.ATHLETE_TEMP_PASSWORD ?? "Pegasus@Temp!2025";
  const password = await bcrypt.hash(tempPassword, 10);

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
