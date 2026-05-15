/**
 * Creates (or resets) the E2E test admin user.
 * Run via: npx ts-node --project tsconfig.json prisma/seed-e2e-user.ts
 */
import bcrypt from "bcrypt";
import { prisma } from "../src/config/prisma";

export const E2E_USERNAME = "e2e_admin";
export const E2E_PASSWORD = "E2e@Pegasus!99";

async function main() {
  const role = await prisma.role.findFirst({ where: { name: "Diretor" } });
  if (!role) throw new Error("Role 'Diretor' not found — run the main seed first.");

  const hash = await bcrypt.hash(E2E_PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { username: E2E_USERNAME },
    update: { password: hash, mustChangePassword: false, active: true },
    create: {
      username: E2E_USERNAME,
      name: "E2E Admin",
      password: hash,
      mustChangePassword: false,
      active: true,
    },
  });

  // Ensure Diretor role is assigned
  const hasRole = await prisma.userRole.findFirst({
    where: { userId: user.id, roleId: role.id },
  });
  if (!hasRole) {
    await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
  }

  console.log(`[E2E] Test user ready: ${E2E_USERNAME} / ${E2E_PASSWORD}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
