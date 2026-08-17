/**
 * Cria uma notificação de "atleta com lesão" para todos os Diretores ativos,
 * pedindo decisão sobre isenção de mensalidade. Útil para reenviar o aviso
 * quando a notificação automática não disparou.
 *
 * Uso: npx ts-node scripts/notify-injury.ts <username-do-atleta>
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const username = process.argv[2];
  if (!username) {
    console.error("Uso: npx ts-node scripts/notify-injury.ts <username-do-atleta>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { username }, select: { athleteId: true } });
  if (!user?.athleteId) {
    console.log(`Usuário "${username}" não encontrado ou sem atleta vinculado.`);
    return;
  }

  const athlete = await prisma.athlete.findUnique({
    where: { id: user.athleteId },
    select: { id: true, name: true, status: true },
  });
  if (!athlete) {
    console.log("Atleta não encontrado.");
    return;
  }
  console.log(`Atleta: ${athlete.name}, status: ${athlete.status}`);

  const diretores = await prisma.user.findMany({
    where: { active: true, roles: { some: { role: { name: "Diretor" } } } },
    select: { id: true, name: true },
  });
  console.log(`Diretores encontrados: ${diretores.map((d) => d.name).join(", ") || "nenhum"}`);

  const meta = JSON.stringify({ action: "lesao_isencao", athleteId: athlete.id, athleteName: athlete.name });
  for (const diretor of diretores) {
    await prisma.notification.create({
      data: {
        userId: diretor.id,
        title: "Atleta com lesão",
        message: `${athlete.name} foi marcado(a) como lesionado(a). Deseja isentar das mensalidades até o retorno?`,
        type: "sistema",
        meta,
      },
    });
    console.log(`✓ Notificação criada para ${diretor.name}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    prisma.$disconnect();
    process.exit(1);
  });
