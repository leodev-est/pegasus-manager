import { prisma } from "../src/config/prisma";
import { E2E_USERNAME } from "./seed-e2e-user";

async function main() {
  await prisma.user.deleteMany({ where: { username: E2E_USERNAME } });
  console.log(`[E2E] Test user removed: ${E2E_USERNAME}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
