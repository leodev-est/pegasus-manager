import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();
const tempPassword = process.env.ATHLETE_TEMP_PASSWORD ?? "Pegasus@Temp!2025";

async function main() {
  const users = await prisma.user.findMany({
    include: { athlete: { select: { name: true, status: true } } },
    orderBy: { name: "asc" },
  });

  console.log(`\nVerificando ${users.length} usuários...\n`);

  for (const user of users) {
    const passwordOk = await bcrypt.compare(tempPassword, user.password);
    console.log(
      `${user.name.padEnd(30)} | active: ${user.active} | mustChange: ${user.mustChangePassword} | tempPass: ${passwordOk ? "✓" : "✗"} | athlete: ${user.athlete?.status ?? "-"}`
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
