import { prisma } from "../src/config/prisma";

const PERMISSIONS_TO_ADD = ["management:create", "management:update"];

async function main() {
  const role = await prisma.role.findFirst({ where: { name: "Conselheiro" } });
  if (!role) {
    console.log("Role 'Conselheiro' não encontrado.");
    return;
  }

  for (const key of PERMISSIONS_TO_ADD) {
    const permission = await prisma.permission.findUnique({ where: { key } });
    if (!permission) {
      console.log(`Permissão '${key}' não encontrada no banco.`);
      continue;
    }

    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
      update: {},
      create: { roleId: role.id, permissionId: permission.id },
    });

    console.log(`✓ ${key} adicionada ao Conselheiro`);
  }

  console.log("Concluído.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
