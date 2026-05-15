import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("teste", 10);

  const user = await prisma.user.upsert({
    where: { username: "teste" },
    update: { password, active: true, mustChangePassword: false },
    create: {
      name: "Usuário Teste",
      username: "teste",
      password,
      active: true,
      mustChangePassword: false,
    },
  });

  const directorRole = await prisma.role.findUnique({ where: { name: "Diretor" } });
  if (directorRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: directorRole.id } },
      update: {},
      create: { userId: user.id, roleId: directorRole.id },
    });
  }

  console.log("Usuário criado:", user.username, "| senha: teste | role: Diretor");
}

main().finally(() => prisma.$disconnect());
