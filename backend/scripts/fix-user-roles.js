const { PrismaClient } = require('@prisma/client');

const RAILWAY_URL = "postgresql://postgres:kzsDKbYJkvaPMDAWjeusTIfnxwObxYZo@tramway.proxy.rlwy.net:32111/railway?sslmode=require";
const NEON_URL = "postgresql://neondb_owner:npg_5PKj2hVRWUqe@ep-winter-paper-acacg3fo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require";

const src = new PrismaClient({ datasources: { db: { url: RAILWAY_URL } } });
const dst = new PrismaClient({ datasources: { db: { url: NEON_URL } } });

async function main() {
  console.log("Buscando roles do Railway e Neon...");
  const srcRoles = await src.role.findMany();
  const dstRoles = await dst.role.findMany();

  // Mapeia nome do role -> ID no Neon
  const neonRoleByName = {};
  for (const r of dstRoles) neonRoleByName[r.name] = r.id;

  // Mapeia ID do Railway -> ID no Neon (via nome)
  const railwayIdToNeonId = {};
  for (const r of srcRoles) {
    if (neonRoleByName[r.name]) {
      railwayIdToNeonId[r.id] = neonRoleByName[r.name];
    } else {
      console.warn(`  ⚠ Role "${r.name}" não existe no Neon — será ignorada`);
    }
  }

  console.log("Buscando UserRoles do Railway...");
  const srcUserRoles = await src.userRole.findMany();

  const dstUsers = await dst.user.findMany({ select: { id: true } });
  const validUserIds = new Set(dstUsers.map(u => u.id));

  const toInsert = srcUserRoles
    .filter(r => validUserIds.has(r.userId) && railwayIdToNeonId[r.roleId])
    .map(r => ({ userId: r.userId, roleId: railwayIdToNeonId[r.roleId] }));

  console.log(`Inserindo ${toInsert.length} UserRoles no Neon...`);
  const result = await dst.userRole.createMany({ data: toInsert, skipDuplicates: true });
  console.log(`✅ ${result.count} novos UserRoles inseridos.`);

  // Verificação final
  const userRoles = await dst.userRole.findMany({
    include: { user: { select: { username: true } }, role: { select: { name: true } } }
  });
  const byUser = {};
  for (const ur of userRoles) {
    if (!byUser[ur.user.username]) byUser[ur.user.username] = [];
    byUser[ur.user.username].push(ur.role.name);
  }
  console.log("\nRoles por usuário no Neon:");
  for (const [user, roles] of Object.entries(byUser)) {
    console.log(`  ${user}: ${roles.join(', ')}`);
  }
}

main().catch(console.error).finally(async () => {
  await src.$disconnect();
  await dst.$disconnect();
});
