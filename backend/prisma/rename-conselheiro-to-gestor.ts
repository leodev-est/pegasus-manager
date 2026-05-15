import { prisma } from "../src/config/prisma";

async function main() {
  const existing = await prisma.role.findFirst({ where: { name: "Conselheiro" } });
  if (!existing) {
    console.log("Role 'Conselheiro' não encontrado — nada a fazer.");
    return;
  }

  const alreadyExists = await prisma.role.findFirst({ where: { name: "Gestor" } });
  if (alreadyExists) {
    console.log("Role 'Gestor' já existe — mesclando permissões.");
    const perms = await prisma.rolePermission.findMany({ where: { roleId: existing.id } });
    for (const rp of perms) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: alreadyExists.id, permissionId: rp.permissionId } },
        update: {},
        create: { roleId: alreadyExists.id, permissionId: rp.permissionId },
      });
    }
    await prisma.userRole.updateMany({ where: { roleId: existing.id }, data: { roleId: alreadyExists.id } });
    await prisma.role.delete({ where: { id: existing.id } });
    console.log("✓ Conselheiro mesclado em Gestor e removido.");
  } else {
    await prisma.role.update({ where: { id: existing.id }, data: { name: "Gestor", description: "Perfil Gestor" } });
    console.log("✓ Role renomeado: Conselheiro → Gestor");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
