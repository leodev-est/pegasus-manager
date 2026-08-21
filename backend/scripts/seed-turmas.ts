/**
 * Cria as turmas iniciais do Pegasus (Feminino/Masculino), preservando o
 * horário/local/data de início já combinados. Idempotente — pode rodar de
 * novo sem duplicar (identifica pelo nome).
 *
 * Uso: npx ts-node scripts/seed-turmas.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const turmas = [
  {
    name: "Feminino",
    daysOfWeek: ["saturday"],
    time: "16:00 às 17:30",
    location: "Rua Lazara de Oliveira Leite, 200 - Jerusalém",
    dependency: "Quadra - CREC",
    color: "#ec4899",
    order: 0,
    startDate: "2026-08-22",
  },
  {
    name: "Masculino",
    daysOfWeek: ["saturday"],
    time: "17:30 às 19:00",
    location: "Rua Lazara de Oliveira Leite, 200 - Jerusalém",
    dependency: "Quadra - CREC",
    color: "#0D47A1",
    order: 1,
    startDate: "2026-08-22",
  },
];

async function main() {
  for (const turma of turmas) {
    const existing = await prisma.turma.findFirst({ where: { name: turma.name } });
    if (existing) {
      await prisma.turma.update({ where: { id: existing.id }, data: turma });
      console.log(`✓ Turma "${turma.name}" atualizada.`);
    } else {
      await prisma.turma.create({ data: turma });
      console.log(`✓ Turma "${turma.name}" criada.`);
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    prisma.$disconnect();
    process.exit(1);
  });
