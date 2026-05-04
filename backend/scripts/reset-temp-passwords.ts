import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tempPassword = process.env.ATHLETE_TEMP_PASSWORD ?? "Pegasus@Temp!2025";
  const hashed = await bcrypt.hash(tempPassword, 10);

  const result = await prisma.user.updateMany({
    where: { mustChangePassword: true },
    data: { password: hashed },
  });

  console.log(`Senha temporária redefinida para ${result.count} usuário(s).`);
  console.log(`Senha temporária: ${tempPassword}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
