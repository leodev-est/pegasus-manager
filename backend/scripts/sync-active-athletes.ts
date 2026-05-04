import { PrismaClient } from "@prisma/client";
import { syncActiveAthleteUser } from "../src/modules/athletes/athlete-user-sync";

const prisma = new PrismaClient();

async function main() {
  const athletes = await prisma.athlete.findMany({
    where: { status: "ativo" },
    include: { user: true },
  });

  const withUser = athletes.filter((a) => a.user);
  const withoutUser = athletes.filter((a) => !a.user);

  console.log(`Total ativos: ${athletes.length}`);
  console.log(`Com usuário: ${withUser.map((a) => a.name).join(", ") || "nenhum"}`);
  console.log(`Sem usuário: ${withoutUser.map((a) => a.name).join(", ") || "nenhum"}`);

  if (withoutUser.length === 0) {
    console.log("\nTodos os atletas ativos já têm usuário.");
    return;
  }

  console.log(`\nCriando usuários para ${withoutUser.length} atleta(s)...`);

  for (const athlete of withoutUser) {
    const user = await syncActiveAthleteUser(athlete);
    if (user) {
      console.log(`  ✓ ${athlete.name} → usuário: ${user.username}`);
    } else {
      console.log(`  ✗ ${athlete.name} → não foi possível criar usuário`);
    }
  }

  console.log("\nConcluído.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
