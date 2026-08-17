/**
 * Apaga as presenças registradas no(s) treino(s) oficial(is) de uma data,
 * para desfazer uma chamada marcada errada. Se a data cair a partir da
 * divisão de turmas (22/08/2026), existem dois treinos nesse dia
 * (feminino/masculino); por padrão apaga os dois, ou só um se a turma for
 * informada.
 *
 * Uso: npx ts-node scripts/clear-chamada.ts <YYYY-MM-DD> [feminino|masculino]
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const targetDate = process.argv[2];
  const gender = process.argv[3];

  if (!targetDate || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    console.error("Uso: npx ts-node scripts/clear-chamada.ts <YYYY-MM-DD> [feminino|masculino]");
    process.exit(1);
  }
  if (gender && gender !== "feminino" && gender !== "masculino") {
    console.error('Turma inválida — use "feminino" ou "masculino".');
    process.exit(1);
  }

  const start = new Date(`${targetDate}T00:00:00.000Z`);
  const end = new Date(`${targetDate}T23:59:59.999Z`);

  const trainings = await prisma.training.findMany({
    where: {
      date: { gte: start, lte: end },
      ...(gender ? { gender } : {}),
    },
    select: { id: true, date: true, title: true, gender: true },
  });

  if (trainings.length === 0) {
    console.log(`Nenhum treino encontrado em ${targetDate}${gender ? ` (turma ${gender})` : ""}.`);
    return;
  }

  for (const training of trainings) {
    console.log(`Treino encontrado: ${training.title} — ${training.date.toISOString()}`);

    const count = await prisma.trainingAttendance.count({ where: { trainingId: training.id } });
    console.log(`Presenças registradas: ${count}`);

    if (count === 0) {
      console.log("Nada a apagar.");
      continue;
    }

    const { count: deleted } = await prisma.trainingAttendance.deleteMany({
      where: { trainingId: training.id },
    });

    console.log(`✓ ${deleted} presenças apagadas.`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    prisma.$disconnect();
    process.exit(1);
  });
